module.exports = {
  unit: {
    options: {
      urls: [
        'http://localhost:8000/test/unit/'
      ],
      testname: 'Kibana Browser Tests',
      build: process.env.TRAVIS_BUILD_ID || 'test build',
      concurrency: 10,
      username: 'kibana',
      key: process.env.SAUCE_ACCESS_KEY,
      browsers: [
        {
          browserName: 'googlechrome',
          platform: 'XP'
        },
        {
          browserName: 'internet explorer',
          version: '10',
          platform: 'Windows 7'
        }
      ]
    }
  }
};