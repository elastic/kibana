# Compatibility and Features

* [Browser testing](#browser-testing)
* [Node](#node)
* [RequireJS](#requirejs)
* [Mocha in the browser](#mocha-in-the-browser)
* [Jasmine](#jasmine)
* [Backbone](#backbone)
* [CoffeeScript in the browser](#coffeescript-in-the-browser)
* [CoffeeScript in node](#coffeescript-in-node)
* [Custom reporter](#custom-reporter)
* [Branch Tracking](#branch-tracking)
* [YUI](#yui)
* [On the Go](#on-the-go)
* [How much jQuery does Bootstrap use?](#how-much-jquery-does-bootstrap-use?)


## Browser Testing

A classic example of browser testing with blanket coverage can be found in [/test/lib-tests](http://alex-seville.github.com/blanket/test/lib-tests/runner.html).  This is blanket covering the blanket code (eating our own dog food).

Blanket can be run in any modern browser (Chrome, FF, Safari, IE9+), but will fail in IE8 or lower.  You may need to use es5-shim to get it working in those environments.  If you feel Blanket should support IE8, please let me know in the Issue Tracker.


## Node testing

Node testing can be seen in [/test/test-node](https://github.com/alex-seville/blanket/tree/master/test/test-node).  These are blanket's own node based tests.


## RequireJS

If you already use RequireJS in your test runner, it's no problem, blanket will work around it.
See an example in [/test/requirejs](http://alex-seville.github.com/blanket/test/requirejs/require_runner.html)


## Mocha in the browser

Mocha can be run in the browser, and blanket seamlessly integrates with it.  All you need to do is reference the mocha adapter when you reference the blanket script, and the rest is done for you.

Check out an example in [/test/mocha-browser](http://alex-seville.github.com/blanket/test/mocha-browser/adapter.html)


## Jasmine

Blanket comes with QUnit support by default, but Jasmine (or any other test runner) can be supported using an adapter (or a custom build!).

An example of Jasmine support can be seen in [/test/jasmine](http://alex-seville.github.com/blanket/test/jasmine/SpecRunner_data_adapter.html)


## Backbone

Backbone, or any external library, doesn't have any effect on blanket.  The [Backbone Koans test suite](http://alex-seville.github.com/blanket/test/backbone-koans/index.html) (by Addy Osmani) illustrates the compatibility.


## CoffeeScript in the browser

If your test runner tests source files written in coffee script, blanket still has you covered.  Using a custom loader, coffeescript files are compiled, instrumented, and tested.

See coffeescript support in [/test/coffee_script](http://alex-seville.github.com/blanket/test/coffee_script/index.html)


## CoffeeScript in node

If your mocha tests use coffee script source files, blanket still has you covered.

See an example in [/test/test-node/]()


## Custom Reporter

You can easily create your own reporters for blanket.  See a frivolously simple example in [/test/custom-reporter](http://alex-seville.github.com/blanket/test/custom-reporter/index.html)


## Branch Tracking

Blanket can track untouched branches.  You can view a simple example in [/test/branchTracking](http://alex-seville.github.com/blanket/test/branchTracking/branch_runner.html?coverage=true)

## YUI

Blanket can be used with the YUI framework.  A custom adapter is required, and the TestRunner code needs to be wrapped in a blanket call.  You can view an example in [/test/yui](../test/yui/runner.html).


## On-the-go

Blanket can be used live to determine how much extraneous code you have on a page.  It displays a live coverage percentage.  As you navigate the site the coverage percentage should increase and you can view full results to see untouched code blocks.  See an example using the Backbone Todos App in [/test/usage](../test/usage/index.html).


## How much jQuery does Bootstrap use?

You can cover dependencies of your source files to see what percentage of a certain library you use.

You can see this in action by viewing [/test/bootstrap](http://alex-seville.github.com/blanket/test/bootstrap/tests/index.html) and seeing that Twitter Bootstrap uses almost 50% of jQuery code!
