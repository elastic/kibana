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

import { delay } from 'bluebird';
import  { Builder, By, Key, until, logging } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const geckoDriver = require('geckodriver');
const chromeDriver = require('chromedriver');

const SECOND = 1000;
const MINUTE = 60 * SECOND;

let attemptCounter = 0;
async function attemptToCreateCommand(log, driverApi) {
  const attemptId = ++attemptCounter;
  log.debug('[webDriver] Creating session');

  const buildDriverInstance = async (browserType) => {
    switch (browserType) {
      case 'chrome':
        const chromeOptions = new chrome.Options();
        const prefs = new logging.Preferences();
        const loggingPref = prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
        chromeOptions.addArguments('verbose');
        if (process.env.TEST_BROWSER_HEADLESS) {
          // Use --disable-gpu to avoid an error from a missing Mesa library, as per
          // https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
          chromeOptions.addArguments('headless', 'disable-gpu');
        }
        chromeOptions.setLoggingPrefs(loggingPref);
        const chromeService = new chrome.ServiceBuilder(chromeDriver.path).enableVerboseLogging();
        return new Builder()
          .forBrowser(browserType)
          .setChromeOptions(chromeOptions)
          .setChromeService(chromeService)
          .build();
      case 'firefox':
        const firefoxOptions = new firefox.Options();
        const firefoxService = new firefox.ServiceBuilder(geckoDriver.path).enableVerboseLogging();
        return new Builder()
          .forBrowser(browserType)
          .setFirefoxOptions(firefoxOptions)
          .setFirefoxService(firefoxService)
          .build();
      default:
        throw new Error(`${browserType} is not supported yet`);
    }
  };
  const browserType = driverApi.getRequiredCapabilities().browserType;
  const session = await buildDriverInstance(browserType);

  if (attemptId !== attemptCounter) return; // abort

  log.debug('[webDriver] Registering session for teardown');
  driverApi.beforeStop(async () => await session.quit());
  if (attemptId !== attemptCounter) return; // abort

  return { driver: session, By, Key, until };
}

export async function initWebDriver({ log, browserDriverApi }) {
  return await Promise.race([
    (async () => {
      await delay(2 * MINUTE);
      throw new Error('remote failed to start within 2 minutes');
    })(),

    (async () => {
      while (true) {
        const command = await Promise.race([
          delay(30 * SECOND),
          attemptToCreateCommand(log, browserDriverApi)
        ]);

        if (!command) {
          continue;
        }

        return command;
      }
    })()
  ]);
}
