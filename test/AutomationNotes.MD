# AUTOMATION NOTES:

## Handy references
* https://theintern.github.io/
* https://theintern.github.io/leadfoot/Element.html
* https://github.com/elastic/kibana-qa

## Running tests using npm task:
(set es port to 9220 and kibana port to 5620 in test/intern.js)

(the Selenium server it starts currently only supports Firefox browser)

* npm run test:ui

The task above takes a little time to start the servers.  We can also start the servers and leave them running, and then run the tests separately;

* npm run test:ui:server

* npm run test:ui:runner

## Running tests locally with your existing (and already running) ElasticSearch, Kibana, and Selenium Server:

(set your es and kibana ports in test/intern.js)

(in this case you can configure your Selenium server to also support Chrome and/or IE browsers)

* npm run test:ui:runner

Or without npm;

* node_modules/intern/bin/intern-runner.js config=test/intern


## General notes:
* Using Page Objects pattern (https://theintern.github.io/intern/#writing-functional-test)
* At least the initial tests for the Settings, Discover, and Visualize tabs all depend on a very specific set of logstash-type data (generated with makelogs).  Since that is a static set of data, all the Discover and Visualize tests use a specific Absolute time range.  This gaurantees the same results each run.
* These tests have been developed and tested with Chrome and Firefox browser.  In theory, they should work on all browsers (that's the benefit of Intern using Leadfoot).
* These tests should also work with an external testing service like https://saucelabs.com/ or https://www.browserstack.com/ but that has not been tested.
