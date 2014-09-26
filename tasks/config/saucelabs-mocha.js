var buildId = 'test build';
if (process.env.TRAVIS_BUILD_ID) {
  buildId = 'travis build #' + process.env.TRAVIS_BUILD_ID;
}

module.exports = {
  unit: {
    options: {
      username: 'kibana',
      key: process.env.SAUCE_ACCESS_KEY,
      urls: ['http://localhost:8000/test/unit/?saucelabs=true'],
      testname: 'Kibana Browser Tests',
      build: buildId,
      concurrency: 10,
      'max-duration': 60,
      maxRetries: 2,
      browsers: [
        {
          browserName: 'chrome',
          platform: 'Windows 7'
        },
        {
          browserName: 'safari',
          platform: 'OS X 10.9',
        },
        {
          browserName: 'firefox',
          platform: 'Windows 7',
        },
        {
          browserName: 'internet explorer',
          platform: 'Windows 8'
        }
      ]
    }
  }
};