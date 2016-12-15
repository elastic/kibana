define(function (require) {
  const serverConfig = require('intern/dojo/node!./server_config');
  return Object.assign({
    debug: true,
    capabilities: {
      'idle-timeout': 99
    },
    environments: [{
      browserName: 'chrome'
    }],
    tunnelOptions: serverConfig.servers.webdriver,
    functionalSuites: [
      'test/functional/index'
    ],

    excludeInstrumentation: /.*/,

    defaultTimeout: 90000,
    defaultTryTimeout: 40000, // tryForTime could include multiple 'find timeouts'
    defaultFindTimeout: 10000  // this is how long we try to find elements on page
  }, serverConfig);
});
