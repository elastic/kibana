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
	phantom.exit(JSON.parse(output).failed > 0 ? 1 : 0);
}

function addLogging() {
	window.addEventListener( "DOMContentLoaded", function() {
		var current_test_assertions = [];
		var existingDone = QUnit.done;

		QUnit.done=function(result){
			existingDone(result);
			console.log('Took ' + result.runtime +  'ms to run ' + result.total + ' tests. ' + result.passed + ' passed, ' + result.failed + ' failed.');
			window.qunitDone = result;
		};
	}, false );
}
