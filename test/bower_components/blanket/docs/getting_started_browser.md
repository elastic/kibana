# Getting Started Guide (browser version)

This guide details using Blanket.js with a simple QUnit test runner in the browser.

To begin you will need:  
* an existing QUnit test runner (including the QUnit script)
* source files
* QUnit tests for those source files


1. Download [Blanket.js](https://raw.github.com/alex-seville/blanket/master/dist/qunit/blanket.min.js) or `bower install blanket`

2. Reference the script in the testrunner HTML file as follows:
```
<script src="blanket.min.js"></script>
```

3. Add a `data-cover` attribute to any source script tags you want covered:
```
<script src="sourceScript.js" data-cover></script>
```

4. Open the test runner in the browser.  The coverage details will be appended below the test results.



**What if I encouter difficulties?**
Add the `data-cover-flags` attribute to your Blanket script tag with the value "debug" to enable debugging mode.

```
<script src="blanket.min.js" data-cover-flags="debug"></script>
```

This will provide logging for everything that Blanket is doing and should help identify any misconfigurations or incompatibilities.