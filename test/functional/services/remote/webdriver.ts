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

import { ToolingLog } from '@kbn/dev-utils';
import { delay } from 'bluebird';
import chromeDriver from 'chromedriver';
// @ts-ignore types not available
import geckoDriver from 'geckodriver';
// @ts-ignore types for 4.0 not available yet
import { Builder, By, Key, logging, until } from 'selenium-webdriver';
// @ts-ignore types not available
import chrome from 'selenium-webdriver/chrome';
// @ts-ignore types not available
import firefox from 'selenium-webdriver/firefox';
// @ts-ignore internal modules are not typed
import { LegacyActionSequence } from 'selenium-webdriver/lib/actions';
// @ts-ignore internal modules are not typed
import { Executor } from 'selenium-webdriver/lib/http';
// @ts-ignore internal modules are not typed
import { getLogger } from 'selenium-webdriver/lib/logging';

import { preventParallelCalls } from './prevent_parallel_calls';

import { Browsers } from './browsers';

const throttleOption = process.env.TEST_THROTTLE_NETWORK;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NO_QUEUE_COMMANDS = ['getStatus', 'newSession', 'quit'];

/**
 * Best we can tell WebDriver locks up sometimes when we send too many
 * commands at once, sometimes... It causes random lockups where we never
 * receive another response from WedDriver and we don't want to live with
 * that risk, so for now I've shimmed the Executor class in WebDiver to
 * queue all calls to Executor#send() if there is already a call in
 * progress.
 */
Executor.prototype.execute = preventParallelCalls(
  Executor.prototype.execute,
  (command: { getName: () => string }) => NO_QUEUE_COMMANDS.includes(command.getName())
);

let attemptCounter = 0;
async function attemptToCreateCommand(log: ToolingLog, browserType: Browsers) {
  const attemptId = ++attemptCounter;
  log.debug('[webdriver] Creating session');

  const buildDriverInstance = async () => {
    switch (browserType) {
      case 'chrome':
        const chromeOptions = new chrome.Options();
        const loggingPref = new logging.Preferences();
        loggingPref.setLevel(logging.Type.BROWSER, logging.Level.ALL);
        chromeOptions.setLoggingPrefs(loggingPref);
        if (process.env.TEST_BROWSER_HEADLESS) {
          // Use --disable-gpu to avoid an error from a missing Mesa library, as per
          // See: https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
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
          // See: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Headless_mode
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

  const session = await buildDriverInstance();

  if (throttleOption === 'true' && browserType === 'chrome') {
    // Only chrome supports this option.
    log.debug('NETWORK THROTTLED: 768k down, 256k up, 100ms latency.');

    (session as any).setNetworkConditions({
      offline: false,
      latency: 100, // Additional latency (ms).
      download_throughput: 768 * 1024, // These speeds are in bites per second, not kilobytes.
      upload_throughput: 256 * 1024,
    });
  }

  if (attemptId !== attemptCounter) {
    return;
  } // abort

  return { driver: session, By, Key, until, LegacyActionSequence };
}

export async function initWebDriver(log: ToolingLog, browserType: Browsers) {
  const logger = getLogger('webdriver.http.Executor');
  logger.setLevel(logging.Level.FINEST);
  logger.addHandler((entry: { message: string }) => {
    log.verbose(entry.message);
  });

  return await Promise.race([
    (async () => {
      await delay(2 * MINUTE);
      throw new Error('remote failed to start within 2 minutes');
    })(),

    (async () => {
      while (true) {
        const command = await Promise.race([
          delay(30 * SECOND),
          attemptToCreateCommand(log, browserType),
        ]);

        if (!command) {
          continue;
        }

        return command;
      }
    })(),
  ]);
}
