/*
* Mocha-BlanketJS adapter
* Adds a BlanketJS coverage report at the bottom of the HTML Mocha report
* Only needed for in-browser report; not required for the grunt/phantomjs task
* 
* Distributed as part of the grunt-blanket-mocha plugin
* https://github.com/ModelN/grunt-blanket-mocha
* (C)2013 Model N, Inc.
* Distributed under the MIT license
* 
* Code originally taken from the BlanketJS project:
* https://github.com/alex-seville/blanket/blob/master/src/adapters/mocha-blanket.js
* Distributed under the MIT license 
*/
(function() {

    if(!mocha) {
        throw new Exception("mocha library does not exist in global namespace!");
    }


    /*
     * Mocha Events:
     *
     *   - `start`  execution started
     *   - `end`  execution complete
     *   - `suite`  (suite) test suite execution started
     *   - `suite end`  (suite) all tests (and sub-suites) have finished
     *   - `test`  (test) test execution started
     *   - `test end`  (test) test completed
     *   - `hook`  (hook) hook execution started
     *   - `hook end`  (hook) hook complete
     *   - `pass`  (test) test passed
     *   - `fail`  (test, err) test failed
     *
     */

    var originalReporter = mocha._reporter;

    var blanketReporter = function(runner) {
            runner.on('start', function() {
                blanket.setupCoverage();
            });

            runner.on('end', function() {
                blanket.onTestsDone();
            });

            runner.on('suite', function() {
                blanket.onModuleStart();
            });

            runner.on('test', function() {
                blanket.onTestStart();
            });

            runner.on('test end', function(test) {                
                blanket.onTestDone(test.parent.tests.length, test.state === 'passed');
            });

            //I dont know why these became global leaks
            runner.globals(['stats', 'failures', 'runner', '_$blanket']);

            originalReporter.apply(this, [runner]);
        };

    // From mocha.js HTML reporter
    blanketReporter.prototype.suiteURL = function(suite){
      return '?grep=' + encodeURIComponent(suite.fullTitle());
    };

    blanketReporter.prototype.testURL = function(test){
      return '?grep=' + encodeURIComponent(test.fullTitle());
    };

    mocha.reporter(blanketReporter);
    var oldRun = mocha.run,
        oldCallback = null;

    mocha.run = function (finishCallback) {
      oldCallback = finishCallback;
      console.log("waiting for blanket...");
    };
    blanket.beforeStartTestRunner({
        callback: function(){
            if (!blanket.options("existingRequireJS")){
                oldRun(oldCallback);
            }
            mocha.run = oldRun;
        }
    });
})();
