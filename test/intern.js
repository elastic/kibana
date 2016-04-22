define(function (require) {
  var serverConfig = require('intern/dojo/node!./server_config');
  var _ = require('intern/dojo/node!lodash');

  return _.assign({
    debug: true,
    capabilities: {
      'selenium-version': '2.53.0',
      // must match URL in tasks/config/downloadSelenium.js
      'idle-timeout': 99
    },
    environments: [{
      browserName: 'firefox'
    }],
    tunnelOptions: serverConfig.servers.webdriver,
    functionalSuites: [
      'test/functional/index'
    ],
    excludeInstrumentation: /.*/,
    // this is how long a test can run before timing out
    defaultTimeout: 90000,
  }, serverConfig);
});
