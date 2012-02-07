/**
 * ==========================================================================
 * Ajax FileUpload with HTML5 Drap and Drop API and File API class
 * 
 * @author Yoshiaki Sugimoto <neo.yoshiaki.sugimoto@gmail.com>
 * @license MIT License
 * 
 * 
 * Supported browser from implemented method:
 * 
 * window.FileReder
 *   Safari, Chrome, Firefox 3.6+
 * window.FormData
 *   Safari, Chrome, Firefox 4+
 * window.XMLHttpRequest.prototype.sendAsBinary
 *   Firefox 3.6+ ( Mozilla extension )
 * Drag and Drop API
 *   Safari, Chrome, Firefox 3.6+
 *   
 * So this library supported:
 *   Safari, Chrome, Firefox3.6+.
 *   Opera, IE does not support...
 *   
 * --------------------------------------------------------------------
 * Usage:
 * 
 * After building DOM, please be declared in the DDUploader
 * new constructor was added to the window object.
 * 
 * <code>
 *  <script type="text/javascript" src="dduploader.js" charset="UTF-8"></script>
 *  <script type="text/javascript">
 *  document.addEventListener('DOMContentLoaded', function() {
 *    var target = document.getElementById('test');
 *    
 *    new DDUploader(target, {
 *      requestURI : 'sample.php',
 *      withParams : {'foo': 'bar' },
 *      areaText : 'Drop here!',
 *      onDragStart : function() { console.log(this); },
 *      onUploadSuccess : function(resp) { console.log(resp.responseText); },
 *      onUploadError : function(resp) { console.log(resp.responseText); }
 *      });
 *   }, false);
 *   </script>
 * </code>
 * 
 * You can specify the behavior by passing a hash to the constructor
 * is also the second argument, accept the first argument to the HTML element.
 * 
 * The second argument is to accept the set value, such as:
 * 
 * allowedTypes (optional) : 
 *   Extension to allow the upload can be specified.
 * 
 * requestURI (required) :
 *   Specifies the URI of the destination when the file upload request of the drop.
 *   
 * withParams (optional) :
 *   Specifies the hash the data to be together when the file upload POST.
 *   
 * areaText (optional)   :
 *   Specifies the text to display in the drop area while dragging.
 *   
 * onDragStart  (optional) : 
 *   A callback function at the start of a drag. 
 *   (this) is the element that you specify in the drop target context.
 *   
 * onUploadSuccess  (optional) :
 *   A callback function when the file upload success.
 *   First argument passed XMLHttpRequest object.
 *   
 * onUploadError  (optional) : 
 *   A callback function when the file upload error.
 *   First argument passed XMLHttpRequest object.
 * 
 * =========================================================================
 */

! window.DDUploader
&& (window.FormData || window.XMLHttpRequest.prototype.sendAsBinary)
&& 'ondragenter' in document
&& 'ondrop'      in document
&& 'ondragleave' in document
&& (function(global) {
	
	var win   = global,
		doc    = win.document,
		params = {
			allowedTypes    : '|gif|jpg|jpeg|png|txt|',
			requestURI      : '',
			withParams      : {},
			areaText        : '',
			onDragStart     : function() {},
			onUploadSuccess : function() {},
			onUploadeError  : function() {}
		};
	
	// Attach namespace
	win.DDUploader = DDUploader;
	
	function mix(base, ext) {
		for ( var i in ext ) {
			if ( ext.hasOwnProperty(i) ) {
				base[i] = ext[i];
			}
		}
		return base;
	}
	
	function cancelEvent(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}
	
	
	/*
	 * DDUploader constructor
	 */
	function DDUploader(dropElement, options) {
		this.drop   = dropElement;
		this.params = mix(params, options || {});
		
		this.processTimes     = 0;
		this.processLength    = 0;
		this.processFiles     = [];
		this.successFiles     = [];
		this.isFormDataEnable = false;
		
		this.clone;
		
		this.construct();
		this.setup();
	}
	
	/*
	 * Prototype methods
	 */
	DDUploader.prototype = {
		constructor : DDUploader,
		
		/**
		 * Constructor
		 * 
		 * Implements detection and create clone element
		 */
		construct : function() {
			var elm = this.drop;
			
			// IS parameters enough?
			if ( ! this.params.requestURI ) {
				throw new Error('requrestURI parameter is required.');
				return;
			}
			
			this.isFormDataEnable = !!win.FormData;
			this.clone = elm.cloneNode(false);
			this.clone.style.display = 'none';
			this.clone.setAttribute('draggable', 'on');
			this.clone.style.KhtmlUserDrag    = 'element';
			this.clone.style.WebkitUserDrag   = 'element';
			this.clone.style.KhtmlUserSelect  = 'none';
			this.clone.style.WebkitUserSelect = 'none';
			this.clone.appendChild(doc.createTextNode(this.params.areaText));
			elm.parentNode.insertBefore(this.clone, elm);
		},
		
		/**
		 * All event handing
		 * 
		 * @param evt
		 */
		handleEvent : function(evt) {
			switch ( evt.type ) {
				case 'dragenter':
				case 'dragover':
					this.dragInit(evt);
					break;
				case 'dragleave':
					this.dragEnd(evt);
					break;
				case 'drop':
					this.dropFile(evt);
					break;
				default :
					break;
			}
		},
		
		/**
		 * Set parameter
		 * 
		 * @param key
		 * @param val
		 */
		setParam : function(key, val) {
			this.param[key] = val;
		},
		
		/**
		 * Set up drag drop
		 */
		setup : function() {
			var drop = this.clone;
			
			// drag drop API event handle start
			// Document event handle
			doc.addEventListener('dragenter', this, false);
			doc.addEventListener('dragover',  this, false);
			doc.addEventListener('dragleave', this, false);
			
			// Drop element event handle
			drop.addEventListener('dragenter', cancelEvent, false);
			drop.addEventListener('dragover',  cancelEvent, false);
			drop.addEventListener('dragleave', this,        false);
			drop.addEventListener('drop',      this,        false);
		},
		
		/**
		 * Drag start event handler
		 * 
		 * @param evt
		 */
		dragInit : function(evt) {
			this.drop.style.display = 'none';
			this.clone.style.display = 'block';
			this.params.onDragStart.call(this.drop, evt);
		},
		
		/**
		 * Drag end event handler
		 * 
		 * @param evt
		 */
		dragEnd : function(evt) {
			evt.preventDefault();
			if ( evt.pageX < 1 || evt.pageY < 1 ) {
				this.drop.style.display = 'block';
				this.clone.style.display = 'none';
			}
		},
		
		/**
		 * Drop file event handler
		 * 
		 * @param evt
		 */
		dropFile : function(evt) {
			cancelEvent(evt);
			
			var i    = -1,
				files = evt.dataTransfer.files;
			
			if ( files.length > 0 ) {
				if ( this.isFormDataEnable ) {
					this.successFiles = files;
					this.__uploadRequest();
				} else {
					this.processFiles  = files;
					this.processLength = files.length;
					this.processTimes  = 0;
					
					this.createFileReader().readAsBinaryString(files[0]);
				}
			}
			
			this.drop.style.display = 'block';
			this.clone.style.display = 'none';
		},
		
		/**
		 * Create window.FileReader object
		 */
		createFileReader : function() {
			var FR = new FileReader(),
				that = this;
			
			FR.onload = function(evt) {
				that.fileLoadCompletedHandler(evt);
			};
			FR.onerror = function() {
				that.fileLoadErrorHandler(evt);
			};
			
			return FR;
		},
		
		/**
		 * FileReader.onload event handler
		 * 
		 * @param evt
		 */
		fileLoadCompletedHandler : function(evt) {
			var file = this.processFiles[this.processTimes],
				FR;
			
			this.successFiles.push({fileName : file.fileName || file.name || '', binaryString : evt.target.result});
			this.processTimes++;
			evt.target = null; // GC
			if ( this.processLength === this.processTimes ) {
				this.__uploadRequest();
			} else if ( this.processLength > this.processTimes ) {
				FR = this.createFileReader();
				FR.readAsBinaryString(this.processFiles[this.processTimes]);
			}
		},
		
		/**
		 * FileReader.onerror event handler
		 * 
		 * @param evt
		 */
		fileLoadErrorHandler : function(evt) {
			var FR;
			
			this.processTimes++;
			evt.target = null; // GC
			if ( this.processLength === this.processTimes ) {
				this.__uploadRequest();
			} else if ( this.processLength > this.processTimes ) {
				FR = this.createFileReader();
				FR.readAsBinaryString(this.processFiles[this.processTimes]);
			}
		},
		
		/**
		 * FileUpload request junction
		 */
		__uploadRequest : function() {
			var xhr = new XMLHttpRequest();
			
			// GC
			this.processFiles = [];
			
			if ( this.isFormDataEnable ) { // Chrome, Safari, Firefox4+ etc...
				this.__uploadByFormDataNativeAPI(xhr);
			} else if ( xhr.sendAsBinary ) { // Firefox extension API
				this.__uploadByXHRExtension(xhr);
			}
		},
		
		/**
		 * Request with XHR+FormData
		 * 
		 * @param xhr
		 */
		__uploadByFormDataNativeAPI : function(xhr) {
			var dat  = new FormData(),
				i     = -1,
				param = this.params,
				file,
				fileName,
				extension;
			
			while ( this.successFiles[++i] ) {
				file     = this.successFiles[i];
				fileName = file.fileName || file.name;
				// uploaded file is allowed extension and has mimetype string?
				extension = fileName.slice(fileName.lastIndexOf('.') + 1);
				if ( param.allowedTypes.indexOf('|' + extension + '|') === -1 || file.type === '' ) {
					continue;
				}
				dat.append('upload_file[]', this.successFiles[i]);
			}
			
			// additional parameters
			for ( i in param.withParams ) {
				if ( param.withParams.hasOwnProperty(i) ) {
					dat.append(i, param.withParams[i]);
				}
			}
			
			// reset
			this.successFiles = [];
			
			xhr.open('POST', param.requestURI, true);
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			xhr.send(dat);
			
			xhr.onload = function() {
				param.onUploadSuccess(xhr);
				xhr = null;
			};
			xhr.onerror = function() {
				param.onUploadError(xhr);
				xhr = null;
			};
		},
		
		/**
		 * Request with XHR.sendAsBinary ( Firefox only )
		 * 
		 * @param xhr
		 */
		__uploadByXHRExtension : function(xhr) {
			var boundary = '----DDUploaderBoundary' + (new Date() | 0),
				dd       = '--',
				crlf     = '\r\n',
				header   = [dd + boundary],
				j        = 0,
				i        = -1,
				param    = this.params,
				file,
				json,
				fileName,
				formData,
				extension,
				requestHeader;
			
			while ( this.successFiles[++i] ) {
				file     = this.successFiles[i];
				fileName = file.fileName || file.name || '';
				
				// uploaded file is allowed extension?
				extension = fileName.slice(fileName.lastIndexOf('.') + 1);
				if ( param.allowedTypes.indexOf('|' + extension + '|') === -1 ) {
					continue;
				}
				// add header
				header[++j] = 'Content-Disposition: form-data; name="upload_file[]"';
				if ( fileName ) {
					header[j] += '; filename="' + fileName + '"';
				}
				header[++j] = 'Content-Type: application/octet-stream';
				header[++j] = crlf;
				header[++j] = file.binaryString;
				header[++j] = dd + boundary;
			}
			
			// additional parameters
			for ( i in param.withParams ) {
				if ( param.withParams.hasOwnProperty(i) ) {
					header[++j] = 'Content-Disposition: form-data; name="' + i + '"';
					header[++j] = 'Content-Type: text/plain';
					header[++j] = crlf;
					header[++j] = param.withParams[i];
					header[++j] = dd + boundary;
				}
			}
			
			header[++j]   = dd + boundary + dd;
			requestHeader = header.join(crlf) + crlf;
			
			// reset
			this.successFiles = [];
			
			xhr.open('POST', param.requestURI, true);
			xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			xhr.sendAsBinary(requestHeader);
			
			xhr.onload = function() {
				param.onUploadSuccess(xhr);
				xhr = null;
			};
			xhr.onerror = function() {
				param.onUploadError(xhr);
				xhr = null;
			};
		}
	};
})(this);