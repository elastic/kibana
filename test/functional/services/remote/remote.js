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

import { initWebDriver } from './webdriver';
const chromeDriver = require('chromedriver');

export async function RemoteProvider({ getService }) {
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const possibleBrowsers = ['chrome', 'firefox', 'ie'];
  const browserType = process.env.TEST_BROWSER_TYPE || 'chrome';

  if (!possibleBrowsers.includes(browserType)) {
    throw new Error(`Unexpected TEST_BROWSER_TYPE "${browserType}". Valid options are ` +  possibleBrowsers.join(','));
  }

  const port = 9515;
  const args = [
    '--url-base=wd/hub',
    `--port=${port}`
  ];

  chromeDriver.start(args);

  const { driver, By, Key, until, LegacyActionSequence } = await initWebDriver({ log, browserType });

  log.info('Remote initialized');

  lifecycle.on('beforeTests', async () => {
    // hard coded default, can be overridden per suite using `browser.setWindowSize()`
    // and will be automatically reverted after each suite
    await driver.setWindowSize(1600, 1000);
  });

  const windowSizeStack = [];
  lifecycle.on('beforeTestSuite', async () => {
    windowSizeStack.unshift(await driver.getWindowSize());
    await driver.setTimeout({ 'implicit': 30000 });
  });

  // lifecycle.on('beforeEachTest', async () => {
  //   await driver.setTimeout({ 'implicit': 20000 });
  // });

  lifecycle.on('afterTestSuite', async () => {
    const { width, height } = windowSizeStack.shift();
    await driver.setWindowSize(width, height);
  });

  lifecycle.on('cleanup', async () => {
    await driver.deleteSession();
    await chromeDriver.stop();
  });

  return { driver, By, Key, until, LegacyActionSequence };
}
