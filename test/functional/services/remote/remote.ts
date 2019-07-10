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

import request from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';
import { initWebDriver } from './webdriver';
import { Browsers } from './browsers';

export async function RemoteProvider({ getService }: FtrProviderContext) {
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const config = getService('config');
  const coverage = getService('coverage');
  const browserType: Browsers = config.get('browser.type');

  const { driver, By, Key, until, LegacyActionSequence } = await initWebDriver(log, browserType);
  const caps = await driver.getCapabilities();
  const browserVersion = caps.get(browserType === Browsers.Chrome ? 'version' : 'browserVersion');

  const loadTestCoverage = async (obj: any): Promise<void> => {
    if (obj !== null) {
      // eslint-disable-next-line no-console
      console.log(`sending code coverage`);
      await request(
        {
          url: `http://localhost:6969/coverage/client`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(obj),
        },
        (error, response, body) => {
          // eslint-disable-next-line no-console
          console.log(`error: ${error}`);
        }
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`no code coverage to send`);
    }
  };

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

  lifecycle.on('afterEachTest', async () => {
    // const browser = getService('browser');
    // await browser.loadTestCoverage();
  });

  lifecycle.on('afterTestSuite', async () => {
    const { width, height } = windowSizeStack.shift()!;
    await (driver.manage().window() as any).setRect({ width, height });
  });

  lifecycle.on('cleanup', async () => {
    const lastData = await driver.executeScript('return window.__coverage__;');
    await driver.quit();
    const data = coverage.getCoverage();
    for (let i = 0; i < data.length; i++) {
      await loadTestCoverage(data[i]);
    }
    await loadTestCoverage(lastData);
  });

  return { driver, By, Key, until, LegacyActionSequence, browserType };
}
