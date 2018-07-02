/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const ci = process.env.CI && process.env.CI === 'true';
Error.stackTraceLimit = Infinity;

//#TODO: Find out why this resolution fails in FF, { width: 1200, height: 1024 }],
exports.config = {
  // #TODO see: https://github.com/webdriverio/webdriverio/issues/2262
  seleniumInstallArgs: { version: '3.4.0' },
  seleniumArgs: { version: '3.4.0' },
  specs: ['./test/wdio_functional/spec/**/*suite.js'],
  maxInstances: 1,
  sync: true,
  port: '4444',
  coloredLogs: true,
  logLevel: 'silent',
  deprecationWarnings: true,
  waitforTimeout: ci ? 300000 : 180000,
  bail: 0,
  screenshotPath: 'test/failure-screenshots',
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000,
    compilers: ['js:babel-register']
  },
  reporters: ['dot', 'spec'],
  services: [ci ? 'sauce' : 'selenium-standalone', 'chromedriver'],
  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  sauceConnect: true,
  baseUrl: 'http://localhost:5620',
  capabilities: [
    {
      browserName: 'chrome',
      version: ci ? '58' : null,
      platform: 'macOS 10.12',
    },
    {
      maxInstances: 1,
      browserName: 'firefox',
      version: ci ? '56' : null,
    },
  ],
  onPrepare: function (config, capabilities) {
    if (ci || process.platform === 'win32') {
      capabilities.push({
        browserName: 'internet explorer',
        killInstances: true,
      });
    }
    if (ci && process.platform !== 'win32') {
      capabilities[1].platform = 'macOS 10.12';
    }
  },
  before: function () {
    require('babel-register');
    global.expect = require('expect');
    global.fetch = require('node-fetch');
    const ProviderCollection = require('../../src/functional_test_runner/lib/providers/provider_collection');
    const getService = new ProviderCollection().getService;
    console.log(getService);
  },
};