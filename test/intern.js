define(function (require) {
  var serverConfig = require('intern/dojo/node!./serverConfig');
  var _ = require('intern/dojo/node!lodash');

  return _.assign({
    debug: false,
    capabilities: {
      'selenium-version': '2.47.1',
      'idle-timeout': 30
    },
    environments: [{
      browserName: 'firefox'
    }],
    tunnelOptions: serverConfig.servers.webdriver,
    functionalSuites: [
      'test/functional/status_page/index',
      'test/functional/apps/settings/index'
    ],
    excludeInstrumentation: /(fixtures|node_modules)\//,
    loaderOptions: {
      paths: {
        'bluebird': './node_modules/bluebird/js/browser/bluebird.js',
        'moment': './node_modules/moment/moment.js'
      }
    }
  }, serverConfig);
});
