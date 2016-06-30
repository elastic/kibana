define({
  suites: [
    'test/unit/api/ingest/index',
    'test/unit/api/search/index',
    'test/unit/api/scripts/index'
    'test/unit/api/i18n/index'
  ],
  excludeInstrumentation: /(fixtures|node_modules)\//,
  loaderOptions: {
    paths: {
      'bluebird': './node_modules/bluebird/js/browser/bluebird.js',
      'moment': './node_modules/moment/moment.js'
    }
  }
});
