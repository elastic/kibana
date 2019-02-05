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
const { LegacyActionSequence } =  require('selenium-webdriver/lib/actions');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const geckoDriver = require('geckodriver');
const chromeDriver = require('chromedriver');
const throttleOption = process.env.TEST_THROTTLE_NETWORK;

const SECOND = 1000;
const MINUTE = 60 * SECOND;

let attemptCounter = 0;
async function attemptToCreateCommand(log, browserType) {
  const attemptId = ++attemptCounter;
  log.debug('[webdriver] Creating session');

  const buildDriverInstance = async (browserType) => {
    switch (browserType) {
      case 'chrome':
        const chromeOptions = new chrome.Options();
        const loggingPref = new logging.Preferences().setLevel(logging.Type.BROWSER, logging.Level.ALL);
        chromeOptions.setLoggingPrefs(loggingPref);
        if (process.env.TEST_BROWSER_HEADLESS) {
          //Use --disable-gpu to avoid an error from a missing Mesa library, as per
          //See: https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
          chromeOptions.addArguments('headless', 'disable-gpu');
        }
        return new Builder()
          .forBrowser(browserType)
          .setChromeOptions(chromeOptions)
          .setChromeService(new chrome.ServiceBuilder(chromeDriver.path).enableVerboseLogging())
          .build();
      case 'firefox':
        const firefoxOptions = new firefox.Options();
        if (process.env.TEST_BROWSER_HEADLESS) {
          //See: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Headless_mode
          firefoxOptions.addArguments('-headless');
        }
        return new Builder()
          .forBrowser(browserType)
          .setFirefoxOptions(firefoxOptions)
          .setFirefoxService(new firefox.ServiceBuilder(geckoDriver.path).enableVerboseLogging())
          .build();
      default:
        throw new Error(`${browserType} is not supported yet`);
    }
  };

  const session = await buildDriverInstance(browserType);

  if (throttleOption === 'true' && browserType === 'chrome')  { //Only chrome supports this option.
    log.debug(session);
    session.setNetworkConditions({
      offline: false,
      latency: 100, // Additional latency (ms).
      download_throughput: 768 * 1024, // These speeds are in bites per second, not kilobytes.
      upload_throughput: 256 * 1024
    });
  }

  if (attemptId !== attemptCounter) return; // abort

  return { driver: session, By, Key, until, LegacyActionSequence };
}

export async function initWebDriver({ log, browserType }) {
  return await Promise.race([
    (async () => {
      await delay(2 * MINUTE);
      throw new Error('remote failed to start within 2 minutes');
    })(),

    (async () => {
      while (true) {
        const command = await Promise.race([
          delay(30 * SECOND),
          attemptToCreateCommand(log, browserType)
        ]);

        if (!command) {
          continue;
        }

        return command;
      }
    })()
  ]);
}
