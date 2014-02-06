May 1-13 - 1.1.4  
Loaded reverting for grunt-blanket, branch tracking reporter fixed, coverage on-the-go (displaying coverage results while a single page is being used).  
  
Apr 28-13 - 1.1.3
YUI support added with custom adapter (and some wrapping code).  CompoundJS support appears to be outside the scope of project.

Apr 15-13 - 1.1.2  
Instrumentation cacheing, and LCOV reporter, and passing options to custom reporters.

Apr 2-13 - 1.1.1  
CommonJS support, based on Browserify. Disable require loader when coverage is disabled (in QUnit).

Mar 22-13 - 1.1.0
Custom variable data attribute to use whatever variable you want for coverage tracking.

Mar 22-13 - 1.0.9
Blanket is not run on require in node now. Update to component version for bower. Branch tracking reporting fix.  Preserve filenames in Node.

Mar 14-13 - 1.0.8
Improvement to branch tracking

Mar 11-13 - 1.0.7
Moving repo to alex-seville/blanket.

Feb 12-13 - 1.0.6
Added debug setting to track program flow.  Minor fixes on both browser and node side.

Feb 8-13 - 1.0.5
Node version will avoid instrumenting anything not in the current directory using `onlyCwd: true` in the package.json file.

Feb 7-13 - 1.0.4
Node version can use the same input attributes as client side version, branchTracking reporting for client, use string, regex or array as filter for node, loading issue fixes for requirejs+blanket.

Jan 23-13 - 1.0.3
Dependencies fixed for node. Various other fixes.

Jan 13-13 - 1.0.2
Branch tracking, Jasmine/RequireJS compatibility fixes, data-cover-never, data-cover-timeout attributes added, fixed bug in mocha adapter, fixed instrumentation of labelled statements, local uploader to deal with CORS issues.

Dec 31-12 - 1.0.1
User guides, minification fixes, coffeescript/custom loader support for browser & node, replaced getters/setters with blanket.options.

Dec 14-12 - 1.0.0
Added to Bower, fixed relative paths issues, added noConflict, refactored core code, added Twitter Bootstrap example.

Dec-8-12 - 0.9.9
Moved Makefile into grunt and reorganized files.  Fixed instrumenting of comments in node.

Dec-3-12 - 0.9.8
Fixes to instrumentation, fix for escaped characters in node.  Added adapters and Jasmine example.

Nov-26-12 - 0.9.7
Custom reporters. Better organization of tests.

Nov-24-12 - 0.9.6
Better line counts, more tests, normalizing slashes for windows, require loader uses module._compile to properly pass the exports, added Makefile for CI, various other fixes. 

Nov-19-12 - 0.9.4
Major refactoring, QUnit tests run with phantomjs, both node and browser tests are covered by blanket on travis-ci.  Compatibility with existing requirejs instance.

Nov-8-12 - 0.9.2
Bug fixes to instrumentation and node require loader.

Nov-4-12 - 0.9.1
Works seamlessly with mocha (in node) and uses built in mocha reporters for coverage.

Oct-29-12 - 0.9.0
Initial release of blanket.js.  Works with qunit, but coverage output is not complete.