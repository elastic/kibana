const ci = process.env.CI && process.env.CI === 'true';
const path = require('path');

//#TODO: Find out why this resolution fails in FF, { width: 1200, height: 1024 }],

exports.config = {
  // #TODO see: https://github.com/webdriverio/webdriverio/issues/2262
  seleniumInstallArgs: { version: '3.4.0' },
  seleniumArgs: { version: '3.4.0' },
  specs: [
    './test/wdio_functional/spec/**/*spec.js'
  ],
  maxInstances: 3,
  sync: true,
  port: '4444',
  coloredLogs: true,
  logLevel: 'silent',
  deprecationWarnings: true,
  waitforTimeout: 60000,
  bail: 0,
  screenshotPath: 'test/failure-screenshots',
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000,
  },
  reporters: ['dot', 'spec'],
  services: [ci ? 'sauce' : 'selenium-standalone', 'chromedriver'],
  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  sauceConnect: true,
  baseUrl: 'http://localhost:5620' ,
  capabilities: [{
    browserName: 'chrome',
    version: ci ? '58' : '65',
    platform: 'macOS 10.12'
  }, {
    // maxInstances can get overwritten per capability. So if you have an in house Selenium
    // grid with only 5 firefox instance available you can make sure that not more than
    // 5 instance gets started at a time.
    maxInstances: 2,
    browserName: 'firefox',
    version: ci ? '56.0' : null
  }],
  onPrepare: function (config, capabilities) {
    if ((ci) || process.platform === 'win32') {
      capabilities.push({
        browserName: 'internet explorer',
        killInstances: true
      });
    }
    if ((ci) && process.platform !== 'win32') {
      capabilities[1].platform =  'macOS 10.12';
    }
  },
  before: function (capabilities, specs) {
    const sinon = require('sinon');
    const chai = require('chai');
    global.expect = chai.expect;
    const chaiWebdriver = require('chai-webdriverio').default;
    chai.use(chaiWebdriver(browser));

    global.fetch = require('node-fetch');

    chai.config.includeStack = true;
    global.AssertionError = chai.AssertionError;
    global.Assertion = chai.Assertion;
    global.assert = chai.assert;
    chai.Should();
  }
};
