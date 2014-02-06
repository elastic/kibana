/*
 * Qt+WebKit powered headless test runner using Phantomjs
 *
 * Phantomjs installation: http://code.google.com/p/phantomjs/wiki/BuildInstructions
 *
 * Run with:
 *  phantomjs runner.js [url-of-your-qunit-testsuite]
 *
 * E.g.
 *      phantomjs runner.js http://localhost/qunit/test
 */

/*jshint latedef:false */
/*global phantom:true require:true console:true */
var url = phantom.args[0],
    page = require('webpage').create();

// Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.onInitialized = function() {
    page.evaluate(addLogging);
};

page.open(url, function(status){
    if (status !== "success") {
        console.log("Unable to access network: " + status);
        phantom.exit(1);
    } else {
        var time=0;
        var interval = setInterval(function() {
            if (finished()) {
                clearInterval(interval);
                onfinishedTests();
            }else if (time > 50){
                console.log("Too long!");
                phantom.exit(1);
            }else{
                time++;
            }
        }, 500);
    }
});

function finished() {
    return page.evaluate(function(){
        
        return !!window.qunitDone;
    });
}

function onfinishedTests() {
    var output = page.evaluate(function() {
            return JSON.stringify(window.qunitDone);
    });
    var num = page.evaluate(function(){
        var blanket_size = function (obj) {
            if (typeof obj === 'undefined'){
                return null;
            }
            var _size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) _size++;
            }
            return _size;
          };
        return typeof window.blanketTestQUnitExpected !== 'undefined' && blanket_size(window._$blanket) !== window.blanketTestQUnitExpected;
    });
    phantom.exit(num ? 1: JSON.parse(output).failed > 0 ? 1 : 0);
}

function addLogging() {
    window.addEventListener( "DOMContentLoaded", function() {
        var current_test_assertions = [];
        QUnit.testDone(function(result) {
            
            var i,
                name = result.module + ': ' + result.name;

            if (result.failed) {
                console.log('Assertion Failed: ' + name);

                for (i = 0; i < current_test_assertions.length; i++) {
                    console.log('    ' + current_test_assertions[i]);
                }
            }
            
            current_test_assertions = [];
            
        });

        QUnit.log(function(details) {
            var response;

            if (details.result) {
                return;
            }

            response = details.message || '';

            if (typeof details.expected !== 'undefined') {
                if (response) {
                    response += ', ';
                }

                response += 'expected: ' + details.expected + ', but was: ' + details.actual;
            }

            current_test_assertions.push('Failed assertion: ' + response);
        });

        QUnit.done(function(result){
            console.log('Took ' + result.runtime +  'ms to run ' + result.total + ' tests. ' + result.passed + ' passed, ' + result.failed + ' failed.');
            window.qunitDone = result;
        });
    }, false );
}
