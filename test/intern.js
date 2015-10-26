define(function (require) {
  var serverConfig = require('intern/dojo/node!./serverConfig');
  var _ = require('intern/dojo/node!lodash');

  return _.assign({
    capabilities: {
      'selenium-version': '2.47.1',
      'idle-timeout': 30
    },
    environments: [{
      browserName: 'firefox'
    }],
    tunnelOptions: serverConfig.webdriver,
    functionalSuites: ['test/functional/status.js'],
    excludeInstrumentation: /(fixtures|node_modules)\//
  }, serverConfig);
});
