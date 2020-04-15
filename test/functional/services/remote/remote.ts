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
  const browserType: Browsers = config.get('browser.type');
  type BrowserStorage = 'sessionStorage' | 'localStorage';

  const clearBrowserStorage = async (storageType: BrowserStorage) => {
    try {
      await driver.executeScript(`window.${storageType}.clear();`);
    } catch (error) {
      if (!error.message.includes(`Failed to read the '${storageType}' property from 'Window'`)) {
        throw error;
      }
    }
  };

  const { driver, By, until, consoleLog$ } = await initWebDriver(
    log,
    browserType,
    lifecycle,
    config.get('browser.logPollingMs')
  );
  const isW3CEnabled = (driver as any).executor_.w3c;

  const caps = await driver.getCapabilities();
  const browserVersion = caps.get(isW3CEnabled ? 'browserVersion' : 'version');

  log.info(`Remote initialized: ${caps.get('browserName')} ${browserVersion}`);

  if (browserType === Browsers.Chrome) {
    log.info(
      `Chromedriver version: ${caps.get('chrome').chromedriverVersion}, w3c=${isW3CEnabled}`
    );
  }

  lifecycle.beforeTests.add(async () => {
    // hard coded default, can be overridden per suite using `browser.setWindowSize()`
    // and will be automatically reverted after each suite
    await driver
      .manage()
      .window()
      .setRect({ width: 1600, height: 1000 });
  });

  const windowSizeStack: Array<{ width: number; height: number }> = [];
  lifecycle.beforeTestSuite.add(async () => {
    windowSizeStack.unshift(
      await driver
        .manage()
        .window()
        .getRect()
    );
  });

  lifecycle.beforeEachTest.add(async () => {
    await driver.manage().setTimeouts({ implicit: config.get('timeouts.find') });
  });

  lifecycle.afterTestSuite.add(async () => {
    const { width, height } = windowSizeStack.shift()!;
    await driver
      .manage()
      .window()
      .setRect({ width, height });
    await clearBrowserStorage('sessionStorage');
    await clearBrowserStorage('localStorage');
  });

  lifecycle.cleanup.add(async () => {
    await driver.quit();
  });

  return { driver, By, until, browserType, consoleLog$ };
}
