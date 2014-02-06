# Advanced Guide (browser version)

This guide details creating a [custom reporter](#reporters), [custom adapter](#adapters), or [cusotm loader](#loaders) for Blanket.js

It is assumed that you have already read the Intermediate guide.

##Adapters

Blanket uses adapters to hook into the test runner, instrument files before the tests, and display the coverage details when the tests complete.

See the Blanket [Mocha adapter](https://raw.github.com/alex-seville/blanket/master/src/adapters/mocha-blanket.js) as an example.

Adapters should be provided as immediately invoked function expressions, i.e.:

```
(function(){
    //adapter code
})();
```

Adapters must implement the following calls:

1. When the test runner starts it must call `blanket.setupCoverage();`  
2. When the test module or suite starts it can call `blanket.onModuleStart();` (optional)  
3. When a test starts it must call `blanket.onTestStart();`
4. When a test ends it must call `blanket.onTestDone(<total>, <num passed>)`  
5. When all the tests are done it must call `blanket.onTestsDone();`  

Finally, the adapter must call the following function:

```
blanket.beforeStartTestRunner({
    callback: function(){ /* command to start test runner */ }
});
```

## Reporters

Custom reporters are used by Blanket to display the coverage results.  Blanket comes bundled with a default reporter, but you can create your own.

See the [simple_json_reporter](https://raw.github.com/alex-seville/blanket/master/src/reporters/simple_json_reporter.js) as a very basic example of a reporter.

Reporters are functions assigned to blanket.customReporter, which accept the coverage results object as an argument, ex:

```
(function myReporter(){
    //your reporter code
    blanket.customReporter=function(coverage_results){
        console.log(coverage_results);
    };
})();
```

The example above will create a reporter that will print the coverage result object to the console.  Not useful, but it illustrates the pattern.

The coverage result object has the following properties:

* instrumentation - Will always be set to "blanket"
* stats - This object has the following properties
  * suites - the number of test suites processed
  * tests - number of tests processed
  * passes - number of tests that passed
  * pending - number of pending tests (should be 0)
  * failures - number of tests that failed
  * start - the datetime that the tests started
* files - an object containing all the source files covered.  Each entry will have the following properties
  * the key is the filename of the source file covered
  * the value consist of two parts
     * an array containing line coverage counts
     * a `source` property containing an array filled with a string representation of each line of source code

An example coverage result object could be:

```
{
    instrumentation: "blanket",
    stats: {
        suites: 1,
        tests: 5,
        passes: 4,
        pending: 0,
        failures: 1,
        start: Dec 15, 16:00:01:034 EST
    },
    files: {
        "sourceFile1.js": {
            1: 3,
            2: null,
            3: 3,
            4: 0,
            5: 3,
            source: [
                "console.log('first line');",
                "//this line is never counted",
                "if (false)",
                "console.log('this line is never executed');",
                "console.log('last line');"
            ] 
        }
    }
}
```

## Loaders

Loaders are used to provide custom requirejs loaders to blanket.
CoffeeScript files can be covered in this manner by providing an overriding version of the requirejs coffeescript plugin.

See the [coffeescript loader](https://raw.github.com/alex-seville/blanket/master/src/loaders/blanket_cs.js) as an example of a loader.
