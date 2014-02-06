# Special Features Guide (browser version)

This guide details special features available in Blanket.js, including: branch tracking, and the local uploader.


## Branch Tracking

Enabling branch tracking allows you to determine if there are branches in your code that are not followed.

For example:

```  
function fcn(x){
    return = x > 5 ? 1 : 2;
}  
```

If your test only calls fcn(6), then the code that is executed when x < 5 is never executed.  This could leave logic blocks untested.

To enable branch tracking use the `data-cover-flags` attribute on the blanket source script reference tag in the test runner:

`<script src="blanket.js" data-cover-flags="branchTracking"></script>`

The default reporter will highlight untouched branches in yellow.


## Local Uploader

If blanket is run locally (with file:// protocol), the loading of source files for instrumentation may fail.  Some browsers may throw a cross origin resource sharing error.

The current workarounds are to [start Chrome with flags](http://askubuntu.com/questions/160245/making-google-chrome-option-allow-file-access-from-files-permanent), use a local server (testserver.js is included for this purpose, and serve is also a good option - `npm install serve -g`), or use a browser that supports cross domain local browser requests (some version of Safari).

The local uploader is a feature that allows you to manually select the source folders or files to allow them to be instrumented (despite the CORS issues).

The local uploader uses the HTML5 file upload API to read the files locally and then pass them to blanket for instrumentation.

This feature is for demonstration purposes and should be abandoned in favour of one of the workarounds mentioned above.
