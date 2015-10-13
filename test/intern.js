define({
  capabilities: {
    'selenium-version': '2.47.1',
    'idle-timeout': 30
  },
  environments: [{
    browserName: 'firefox' // chrome
  }],

  // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
  maxConcurrency: 1,

  // Whether or not to start Sauce Connect before running tests
  useSauceConnect: false,

  // Whether or not events transmitted from the unit testing system to the test runner should cause the
  // unit testing system to pause until a response is received from the test runner. This is necessary
  // if you expect to be able to do things like take screenshots of the browser before/after each unit test
  // executes from a custom reporter. This property can be set to true to always wait for the test runner
  // after each event from the test system, or 'fail' to only wait if the event was a test failure or other error.
  runnerClientReporter: true,



  // Name of the tunnel class to use for WebDriver tests.
  // See <https://theintern.github.io/intern/#option-tunnel> for built-in options
  //tunnel: 'BrowserStackTunnel',

  // Connection information for the remote WebDriver service. If using Sauce Labs, keep your username and password
  // in the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables unless you are sure you will NEVER be
  // publishing this configuration file somewhere
  webdriver: {
    host: 'localhost',
    port: 4444
  },
  kibana: {
    protocol: 'http',
    hostname: 'localhost',
    port: 5601
  },
  elasticsearch: {
    protocol: 'http',
    hostname: 'localhost',
    port: 9200
  },

  // Configuration options for the module loader; any AMD configuration options supported by the AMD loader in use
  // can be used here.
  // If you want to use a different loader than the default loader, see
  // <https://theintern.github.io/intern/#option-useLoader> for instruction
  loaderOptions: {
    // Packages that should be registered with the loader in each testing environment
    //    packages: [ { name: 'myPackage', location: '.' } ]

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
      'bluebird': './node_modules/bluebird/js/browser/bluebird.js'
    }
  },

  // Non-functional test suite(s) to run in each browser
  suites: [ /* 'tests/unit/hello'  'myPackage/tests/foo', 'myPackage/tests/bar' */ ],

  // Functional test suite(s) to execute against each browser once non-functional tests are completed
  // functionalSuites: ['test/functional/testSettings', 'test/functional/testDiscover', 'test/functional/testVisualize'],
  // functionalSuites: ['test/functional/testSettings' /* 'myPackage/tests/functional' */ ],
  functionalSuites: ['test/functional/testDiscover' /* 'myPackage/tests/functional' */ ],
  // functionalSuites: ['test/functional/testVisualize' /* 'myPackage/tests/functional' */ ],

  // A regular expression matching URLs to files that should not be included in code coverage analysis
  // excludeInstrumentation: /^(?:tests|node_modules)\//
  excludeInstrumentation: /^(node_modules)\//
    // excludeInstrumentation: /(fixtures|node_modules)\//
});
