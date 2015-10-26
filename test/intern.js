define({
  capabilities: {
    'selenium-version': '2.47.1',
    'idle-timeout': 30
  },
  environments: [{
    browserName: 'firefox'
  }],
  webdriver: {
    host: 'localhost',
    port: 4444
  },
  kibana: {
    protocol: 'http',
    hostname: 'localhost',
    port: 5620
      // port: 5601
  },
  elasticsearch: {
    protocol: 'http',
    hostname: 'localhost',
    port: 9220
      // port: 9200
  },
  loaderOptions: {
    packages: [{
      name: 'intern-selftest',
      location: '.'
    }],
    map: {
      'intern-selftest': {
        dojo: 'intern-selftest/node_modules/dojo'
      }
    },
    paths: {
      'bluebird': './node_modules/bluebird/js/browser/bluebird.js',
      'moment': './node_modules/moment/moment.js'
    }
  },
  // functionalSuites: ['test/functional/status.js'],
  // functionalSuites: ['test/functional/testSettings'],
  // functionalSuites: ['test/functional/testDiscover'],
  // functionalSuites: ['test/functional/testVisualize'],
  functionalSuites: ['test/functional/status.js', 'test/functional/testSettings'],
  // functionalSuites: ['test/functional/testDiscover', 'test/functional/testVisualize'],
  // functionalSuites: ['test/functional/testSettings', 'test/functional/testDiscover', 'test/functional/testVisualize'],
  excludeInstrumentation: /(fixtures|node_modules)\//
});
