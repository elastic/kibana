# Blanket Options (browser version)

This guide details all the configuration options available for the browser version of Blanket.js

1.  data-cover-adapter
2.  data-cover-customVariable
3.  data-cover-flags     
  a.  autoStart  
  b.  branchTracking
  c.  commonJS  
  d.  debug  
  e.  engineOnly  
  f.  existingRequireJS
  g.  ignoreCors
  h.  ignoreError
  i.  instrumentCache 
  j.  sourceURL   
4.  data-cover-loader 
5.  data-cover-modulepattern 
6.  data-cover-never 
7.  data-cover-only  
8.  data-cover-reporter  
9.  data-cover-reporter-options 
10.  data-cover-testReadyCallback  
11.  data-cover-timeout  


1. data-cover-adapter

Use this option to configure a custom adapter for Blanket.  Examples include adapters for Jasmine or Mocha.  An adapter can be any code intended to run in concert with Blanket.  Adapters do not have any special execution scope or access to Blanket, but they are required to override the default QUnit bindings.

The value for this setting must be a string representing a valid url path to the adapter JavaScript file.

Syntax: data-cover-adapter="<path/to/adapter>"
Example: `data-cover-adapter="src/adapters/mocha-blanket.js"
Result: The mocha-blanket adapter, located in src/adapters, will be loaded when the main Blanket script is executed.


2. data-cover-customVariable

This option can be used to override the default coverage variable name (_$blanket).  Often this isn't required, but there may be use cases where you'd like it to match the variable name of another coverage package (i.e. _$jscoverage) or avoid collisions with local variables in your code.

NOTE: There are no checks done to ensure that the variable you provide is valid.  It is your responsibility to ensure that a valid, conflict-free variable name is provided.

Syntax: data-cover-customVariable="<custom variable name>"
Example: data-cover-customVariable="myCoverageVariable"
Result: Blanket will use `myCoverageVariable` as the coverage variable.  After covered files are executed you can retrieve coverage information by querying the `myCoverageVariable` variable.


3. data-cover-flags

The data-cover-flags option is used to set a variety of boolean settings.  It is a string value, and if an option is included in the string it will be set to `true`.

The syntax for data-cover-flag values is `data-cover-flags="<whitespace separated list of flags>"`, i.e. `data-cover-flags="ignoreError debug"`.

  a. autoStart

  h. ignoreError

  This option is used to force Blanket to continue processing even if an error occurs during instrumentation.  This allows users to manage error handling in their prefered manner.




7. data-cover-only

This option is used to indicate which files you want included for coverage.  The value can be a string, regular expression, array, or function.
If you're including it in a data attribute, you must use the following format:

regular expression: data-cover-only="//<your regular expression>"
example: data-cover-only="//sourcefile[0-9]{2}.js$/i"
result: the file `sourcefile89.js` would be covered.

array: data-cover-only="[<comma separated list of strings, regular expressions, arryas or functions>]"
example: data-cover-only="['src/','modules/']"
result: files contains `src/` and `modules/` in their files paths will be covered.

function: data-cover-only="#<function declaration or function name>"
example: data-cover-only="#function(str){ return str.length < 5; }"
result: any files whose path is less than 5 characters will be covered.


6. data-cover-never

This option is used to indicate which files you want excluded from coverage.  If a file matches this setting it will be excluded, even if it matches a pattern from `data-cover-only`. The value can be a string, regular expression, array, or function.
If you're including it in a data attribute, you must use the following format:

regular expression: data-cover-never="//<your regular expression>"
example: data-cover-never="//sourcefile[0-9]{2}.js$/i"
result: the file `sourcefile89.js` would be excluded from coverage.

array: data-cover-never="[<comma separated list of strings, regular expressions, arryas or functions>]"
example: data-cover-never="['src/','modules/']"
result: files contains `src/` and `modules/` in their files paths will be excluded from coverage.

function: data-cover-never="#<function declaration or function name>"
example: data-cover-never="#function(str){ return str.length < 5; }"
result: any files whose path is less than 5 characters will be excluded from coverage.


8. data-cover-reporter

This option is used to set a custom reporter for Blanket.  The value can be a string (valid file path to reporter file), or a function (accepting the coverage result as an argument).

string: data-cover-reporter="<path/to/custom/reporter>"
example: data-cover-reporter="mocha_blanket_reporter.js"
result: The reporter defined in mocha_blanket_reporter will be attached as the reporter for Blanket coverage results.

function: blanket.options('data-cover-reporter',<reporter function>);
example: blanket.options('data-cover-reporter',function myReporter(cov){ alert(cov); });
result: The full coverage object will be outputted via an alert dialog.
