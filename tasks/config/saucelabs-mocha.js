module.exports = {
  unit: {
    options: {
      urls: [
        'http://localhost:8000/test/unit/?saucelabs=true'
      ],
      testname: 'Kibana Browser Tests',
      build: process.env.TRAVIS_BUILD_ID || 'test build',
      concurrency: 10,
      username: 'kibana',
      key: process.env.SAUCE_ACCESS_KEY,
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
          platform: 'Linux',
        },
        {
          browserName: 'internet explorer',
          platform: 'Windows 8'
        }
      ]
    }
  }
};