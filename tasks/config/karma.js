module.exports = function (grunt) {
  return {
    options: {
      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',

      captureTimeout: 30000,
      browserNoActivityTimeout: 120000,
      frameworks: ['mocha'],
      port: 9876,
      colors: true,
      logLevel: grunt.option('debug') || grunt.option('verbose') ? 'DEBUG' : 'INFO',
      autoWatch: false,
      browsers: ['<%= karmaBrowser %>'],

      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: process.env.CI ? ['dots'] : ['progress'],

      // list of files / patterns to load in the browser
      files: [
        'http://localhost:5610/bundles/commons.bundle.js',
        'http://localhost:5610/bundles/tests.bundle.js',
        'http://localhost:5610/bundles/commons.style.css',
        'http://localhost:5610/bundles/tests.style.css'
      ],

      proxies: {
        '/tests/': 'http://localhost:5610/tests/',
        '/bundles/': 'http://localhost:5610/bundles/'
      },

      client: {
        mocha: {
          reporter: 'html', // change Karma's debug.html to the mocha web reporter
          timeout: 10000,
          slow: 5000
        }
      }
    },

    dev: { singleRun: false },
    unit: { singleRun: true },
    coverage: {
      singleRun: true,
      reporters: ['coverage'],
      coverageReporter: {
        reporters: [
          { type: 'html', dir: 'coverage' },
          { type: 'text-summary' },
        ]
      }
    }
  };
};
