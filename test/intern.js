define({
  capabilities: {
    'selenium-version': '2.47.1',
    'idle-timeout': 30
  },
  environments: [
    {
      browserName: 'firefox'
    }
  ],
  webdriver: {
    host: 'localhost',
    port: 4444
  },
  kibana: {
    protocol: 'http',
    hostname: 'localhost',
    port: 5620
  },
  elasticsearch: {
    protocol: 'http',
    hostname: 'localhost',
    port: 9220
  },
  functionalSuites: ['test/functional/status.js'],
  excludeInstrumentation: /(fixtures|node_modules)\//
});
