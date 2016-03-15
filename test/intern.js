define(function (require) {
  var serverConfig = require('intern/dojo/node!./server_config');
  var _ = require('intern/dojo/node!lodash');

  return _.assign({
    debug: true,
    capabilities: {
      'selenium-version': '2.48.2',
      'idle-timeout': 99
    },
    environments: [{
      browserName: 'firefox'
    }],
    tunnelOptions: serverConfig.servers.webdriver,
    functionalSuites: [
      'test/functional/status_page/index',
      'test/functional/apps/settings/index',
      'test/functional/apps/discover/index',
      'test/functional/apps/visualize/index'
    ],
    excludeInstrumentation: /(fixtures|node_modules)\//,
    loaderOptions: {
      paths: {
        'bluebird': './node_modules/bluebird/js/browser/bluebird.js',
        'moment': './node_modules/moment/moment.js'
      }
    },
    timeouts: {
      // this is how long a test can run before timing out
      default: 90000
    },
  }, serverConfig);
});
