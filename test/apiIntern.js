define({
  suites: [
    'test/unit/api/ingest/index'
  ],
  excludeInstrumentation: /(fixtures|node_modules)\//,
  loaderOptions: {
    paths: {
      'bluebird': './node_modules/bluebird/js/browser/bluebird.js',
      'moment': './node_modules/moment/moment.js'
    }
  }
});
