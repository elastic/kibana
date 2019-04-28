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

import { FtrProviderContext } from '../../ftr_provider_context';
import { initWebDriver } from './webdriver';
import { Browsers } from './browsers';

export async function RemoteProvider({ getService }: FtrProviderContext) {
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const config = getService('config');
  const browserType: Browsers = (process.env.TEST_BROWSER_TYPE as Browsers) || Browsers.Chrome;

  if (browserType !== Browsers.Chrome && browserType !== Browsers.Firefox) {
    throw new Error(
      `Unexpected TEST_BROWSER_TYPE "${browserType}", only "chrome" and "firefox" are supported`
    );
  }

  const { driver, By, Key, until, LegacyActionSequence } = await initWebDriver(log, browserType);
  const caps = await driver.getCapabilities();
  const browserVersion = caps.get(browserType === Browsers.Chrome ? 'version' : 'browserVersion');

  log.info(`Remote initialized: ${caps.get('browserName')} ${browserVersion}`);

  if (browserType === Browsers.Chrome) {
    log.info(`Chromedriver version: ${caps.get('chrome').chromedriverVersion}`);
  }

  lifecycle.on('beforeTests', async () => {
    // hard coded default, can be overridden per suite using `browser.setWindowSize()`
    // and will be automatically reverted after each suite
    await (driver.manage().window() as any).setRect({ width: 1600, height: 1000 });
  });

  const windowSizeStack: Array<{ width: number; height: number }> = [];
  lifecycle.on('beforeTestSuite', async () => {
    windowSizeStack.unshift(await (driver.manage().window() as any).getRect());
  });

  lifecycle.on('beforeEachTest', async () => {
    await (driver.manage() as any).setTimeouts({ implicit: config.get('timeouts.find') });
  });

  lifecycle.on('afterTestSuite', async () => {
    const { width, height } = windowSizeStack.shift()!;
    await (driver.manage().window() as any).setRect({ width, height });
  });

  lifecycle.on('cleanup', async () => await driver.quit());

  return { driver, By, Key, until, LegacyActionSequence, browserType };
}
