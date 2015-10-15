# AUTOMATION NOTES:

## Handy references
* https://theintern.github.io/
* https://theintern.github.io/leadfoot/Element.html
* https://github.com/elastic/kibana-qa


## Running tests locally with your existing (and already running) ElasticSearch, Kibana, and Selenium Server;
node_modules/intern/bin/intern-runner.js config=test/intern

## Running tests using npm task;
npm run test:ui

The task above takes a little time to start the servers.  We can also start the servers and leave them running, and then run the tests separately;

npm run test:ui:server

npm run test:ui:runner

## General notes:
* Using Page Objects pattern (https://theintern.github.io/intern/#writing-functional-test)
* At least the initial tests for the Settings, Discover, and Visualize tabs all depend on a very specific set of logstash-type data (generated with makelogs).  Since that is a static set of data, all the Discover and Visualize tests use a specific Absolute time range.  This gaurantees the same results each run.
