# Intermediate Guide (browser version)

This guide details using Blanket.js with a custom adapter to run Blanket with a test runner other than QUnit (ex. Jasmine), and covers some of the configuration options available.

It is assumed that you have already read the Getting Started guide.

To begin you will need:  
* an existing test runner (including the test library script)
* source files
* tests for those source files

NOTE: PhantomJS and other third-party JS runtimes may not support synchronous XHR requests.  If this is the case you cannot use the `data-cover-adapter` or `data-cover-reporter` attribute.  You will need to include a separate script tag for the reporter/adapter directly below the Blanket script tag.


1. Download [Blanket.js](https://raw.github.com/alex-seville/blanket/master/dist/qunit/blanket.min.js) or `bower install blanket`

2. Download a Blanket adapter for your test runner.  Currently there are adapters for [Jasmine](https://raw.github.com/alex-seville/blanket/master/src/adapters/jasmine-blanket.js) and (browser based) [Mocha](https://raw.github.com/alex-seville/blanket/master/src/adapters/mocha-blanket.js).

3. Reference the script and adapter in the testrunner HTML file as follows:
    ```<script src="blanket.min.js" data-cover-adapter="jasmine-blanket.js"></script>```

4. Add a `data-cover-only` attribute to avoid having to add `data-cover` to each script you want covered.  You can pass the filter value as a string to match, an array of filename, or a regular expression (add a double slash to the start, i.e. `data-cover-only="//.*/"`):
    ```<script src="blanket.min.js" data-cover-adapter="jasmine-blanket.js"  
        data-cover-only="['source1.js','src/source2.js']"></script>```

5. Add a `data-cover-modulepattern` attribute to have the reporter generate total coverage statistics for each module in your application.  (*Currently only supported using QUnit reporter.*)  This is useful for tracking code coverage across multiple teams that work on different modules.  Modules are determined by the regular expression pattern you pass via this attribute.  The regular expression is expected to have one pattern matching section in parenthesis, which will be captured as the module name.  For example, let's say that the files in your blanket report look like this:

```
./core/src/js/MainView.js
./core/src/js/NavBar.js
./gallery/src/js/GalleryView.js
./cart/src/js/Cart.js
```

In this case, we want the module to be recognized as the characters in between the first two slashes, such that we end up with modules `core`, `gallery`, and `cart`.   To achieve this, specify an attribute like so: `data-cover-modulepattern="\.\/(.*?)\/"` 

This regular expression says, look for a period, followed by a slash, followed by any number of characters up until the next slash (which we store as a matched pattern).   For more info on regular expressions, see the [MDN RegEx guide](https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Regular_Expressions).

6. Open the test runner in the browser.  The coverage details will be appended below the test results.

7. If you will always be using the adapter, consider making a [custom build](https://github.com/alex-seville/blanket/blob/master/README.md#roll-your-own) of blanket (i.e. `dist/jasmine/blanket_jasmine.js`). 
