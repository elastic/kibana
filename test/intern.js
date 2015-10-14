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
  functionalSuites: ['test/functional/status.js'],
  excludeInstrumentation: /(fixtures|node_modules)\//
});
