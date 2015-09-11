// Learn more about configuring this file at <https://theintern.github.io/intern/#configuration>.
// These default settings work OK for most people. The options that *must* be changed below are the
// packages, suites, excludeInstrumentation, and (if you want functional tests) functionalSuites
define({

  // The port on which the instrumenting proxy will listen
  proxyPort: 9000,

  // A fully qualified URL to the Intern proxy
  proxyUrl: 'http://localhost:9000/',


  // Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
  // specified browser environments in the `environments` array below as well. See
  // <https://theintern.github.io/intern/#option-capabilities> for links to the different capabilities options for
  // different services.
  //
  // Note that the `build` capability will be filled in with the current commit ID or build tag from the CI
  // environment automatically
  capabilities: {
    'selenium-version': '2.45.0',
    'idle-timeout': 30

    //'browserstack.selenium_version': '2.45.0'
  },

  // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
  // OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
  // capabilities options specified for an environment will be copied as-is
  environments: [
    /*{ browserName: 'internet explorer', version: '11', platform: 'WIN8' },
    { browserName: 'internet explorer', version: '10', platform: 'WIN8' },
    { browserName: 'internet explorer', version: '9', platform: 'WINDOWS' },
    { browserName: 'firefox', version: '37', platform: [ 'WINDOWS', 'MAC' ] },
    { browserName: 'chrome', version: '39', platform: [ 'WINDOWS', 'MAC' ] },
    { browserName: 'safari', version: '8', platform: 'MAC' }  */
    // {
    //   browserName: 'chrome'
    // }
    // {
    //   browserName: 'internet explorer'
    // }
    // ,


    {
      browserName: 'firefox'
    }
  ],

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
    }

  },

  // Non-functional test suite(s) to run in each browser
  suites: [ /* 'tests/unit/hello'  'myPackage/tests/foo', 'myPackage/tests/bar' */ ],

  // Functional test suite(s) to execute against each browser once non-functional tests are completed
  // functionalSuites: ['test/functional/settingsDefaults' /* 'myPackage/tests/functional' */ ],
  functionalSuites: ['test/functional/testDiscover' /* 'myPackage/tests/functional' */ ],
  // functionalSuites: ['test/functional/testVisualize' /* 'myPackage/tests/functional' */ ],
  // functionalSuites: ['test/functional/testScreenshot' /* 'myPackage/tests/functional' */ ],

  // A regular expression matching URLs to files that should not be included in code coverage analysis
  excludeInstrumentation: /^(?:tests|node_modules)\//
});
