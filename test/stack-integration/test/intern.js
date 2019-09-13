define(function (require) {
  const serverConfig = require('intern/dojo/node!./server_config');
  return Object.assign({
    debug: true,
    capabilities: {
      'idle-timeout': 99
      //acceptInsecureCerts: true
    },
    environments: [{
      browserName: process.env.BROWSER || 'chrome',
      //browserName: 'chrome',
	  version: 11,
      //marionette: true,
      excludeInstrumentation: true,
	  chromeOptions: { args: ['auth-server-whitelist=localhost']}
      //acceptInsecureCerts: true
    }],

    // tunnel: 'SeleniumTunnel',
    // tunnelOptions: {
    //   drivers: [ 'chrome', 'firefox' ]
    // },
    tunnelOptions: serverConfig.servers.webdriver,
    functionalSuites: [
      'test/functional/index'
    ],
    //changed file
    excludeInstrumentation: /.*/,

    defaultTimeout: 1800000,
    defaultTryTimeout: 40000, // tryForTime could include multiple 'find timeouts'
    defaultFindTimeout: 20000  // this is how long we try to find elements on page
  }, serverConfig);
});
