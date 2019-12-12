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

import { delimiter } from 'path';

import * as Rx from 'rxjs';
import { mergeMap, map, takeUntil } from 'rxjs/operators';
import { Lifecycle } from '@kbn/test/src/functional_test_runner/lib/lifecycle';
import { ToolingLog } from '@kbn/dev-utils';
import { delay } from 'bluebird';
import chromeDriver from 'chromedriver';
// @ts-ignore types not available
import geckoDriver from 'geckodriver';
import { Builder, Capabilities, By, logging, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';
// @ts-ignore types not available
import ie from 'selenium-webdriver/ie';
// @ts-ignore internal modules are not typed
import { Executor } from 'selenium-webdriver/lib/http';
// @ts-ignore internal modules are not typed
import { getLogger } from 'selenium-webdriver/lib/logging';

import { pollForLogEntry$ } from './poll_for_log_entry';
import { createStdoutSocket } from './create_stdout_stream';
import { preventParallelCalls } from './prevent_parallel_calls';

import { Browsers } from './browsers';

const throttleOption: string = process.env.TEST_THROTTLE_NETWORK as string;
const headlessBrowser: string = process.env.TEST_BROWSER_HEADLESS as string;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NO_QUEUE_COMMANDS = ['getLog', 'getStatus', 'newSession', 'quit'];

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
async function attemptToCreateCommand(
  log: ToolingLog,
  browserType: Browsers,
  lifecycle: Lifecycle,
  logPollingMs: number
) {
  const attemptId = ++attemptCounter;
  log.debug('[webdriver] Creating session');

  const buildDriverInstance = async () => {
    switch (browserType) {
      case 'chrome': {
        const chromeCapabilities = Capabilities.chrome();
        const chromeOptions = [
          // Disables the sandbox for all process types that are normally sandboxed.
          'no-sandbox',
          // Launches URL in new browser window.
          'new-window',
          // By default, file:// URIs cannot read other file:// URIs. This is an override for developers who need the old behavior for testing.
          'allow-file-access-from-files',
          // Use fake device for Media Stream to replace actual camera and microphone.
          'use-fake-device-for-media-stream',
          // Bypass the media stream infobar by selecting the default device for media streams (e.g. WebRTC). Works with --use-fake-device-for-media-stream.
          'use-fake-ui-for-media-stream',
        ];
        if (process.platform === 'linux') {
          // The /dev/shm partition is too small in certain VM environments, causing
          // Chrome to fail or crash. Use this flag to work-around this issue
          // (a temporary directory will always be used to create anonymous shared memory files).
          chromeOptions.push('disable-dev-shm-usage');
        }
        if (headlessBrowser === '1') {
          // Use --disable-gpu to avoid an error from a missing Mesa library, as per
          // See: https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
          chromeOptions.push('headless', 'disable-gpu');
        }
        chromeCapabilities.set('goog:chromeOptions', {
          w3c: false,
          args: chromeOptions,
        });
        chromeCapabilities.set('goog:loggingPrefs', { browser: 'ALL' });

        const session = await new Builder()
          .forBrowser(browserType)
          .withCapabilities(chromeCapabilities)
          .setChromeService(new chrome.ServiceBuilder(chromeDriver.path).enableVerboseLogging())
          .build();

        return {
          session,
          consoleLog$: pollForLogEntry$(session, logging.Type.BROWSER, logPollingMs).pipe(
            takeUntil(lifecycle.cleanup.after$),
            map(({ message, level: { name: level } }) => ({
              message: message.replace(/\\n/g, '\n'),
              level,
            }))
          ),
        };
      }

      case 'firefox': {
        const firefoxOptions = new firefox.Options();
        // Firefox 65+ supports logging console output to stdout
        firefoxOptions.set('moz:firefoxOptions', {
          prefs: { 'devtools.console.stdout.content': true },
        });
        if (headlessBrowser === '1') {
          // See: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Headless_mode
          firefoxOptions.headless();
        }

        // Windows issue with stout socket https://github.com/elastic/kibana/issues/52053
        if (process.platform === 'win32') {
          const session = await new Builder()
            .forBrowser(browserType)
            .setFirefoxOptions(firefoxOptions)
            .setFirefoxService(new firefox.ServiceBuilder(geckoDriver.path))
            .build();
          return {
            session,
            consoleLog$: Rx.EMPTY,
          };
        }

        const { input, chunk$, cleanup } = await createStdoutSocket();
        lifecycle.cleanup.add(cleanup);

        const session = await new Builder()
          .forBrowser(browserType)
          .setFirefoxOptions(firefoxOptions)
          .setFirefoxService(
            new firefox.ServiceBuilder(geckoDriver.path).setStdio(['ignore', input, 'ignore'])
          )
          .build();

        const CONSOLE_LINE_RE = /^console\.([a-z]+): ([\s\S]+)/;

        return {
          session,
          consoleLog$: chunk$.pipe(
            map(chunk => chunk.toString('utf8')),
            mergeMap(msg => {
              const match = msg.match(CONSOLE_LINE_RE);
              if (!match) {
                log.debug('Firefox stdout: ' + msg);
                return [];
              }

              const [, level, message] = match;
              return [
                {
                  level,
                  message: message.trim(),
                },
              ];
            })
          ),
        };
      }

      case 'ie': {
        // https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/ie_exports_Options.html
        const driverPath = require.resolve('iedriver/lib/iedriver');
        process.env.PATH = driverPath + delimiter + process.env.PATH;

        const ieCapabilities = Capabilities.ie();
        ieCapabilities.set('se:ieOptions', {
          'ie.ensureCleanSession': true,
          ignoreProtectedModeSettings: true,
          ignoreZoomSetting: false, // requires us to have 100% zoom level
          nativeEvents: true, // need this for values to stick but it requires 100% scaling and window focus
          requireWindowFocus: true,
          logLevel: 'TRACE',
        });

        const session = await new Builder()
          .forBrowser(browserType)
          .withCapabilities(ieCapabilities)
          .build();

        return {
          session,
          consoleLog$: Rx.EMPTY,
        };
      }

      default:
        throw new Error(`${browserType} is not supported yet`);
    }
  };

  const { session, consoleLog$ } = await buildDriverInstance();

  if (throttleOption === '1' && browserType === 'chrome') {
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

  return { driver: session, By, until, consoleLog$ };
}

export async function initWebDriver(
  log: ToolingLog,
  browserType: Browsers,
  lifecycle: Lifecycle,
  logPollingMs: number
) {
  const logger = getLogger('webdriver.http.Executor');
  logger.setLevel(logging.Level.FINEST);
  logger.addHandler((entry: { message: string }) => {
    if (entry.message.match(/\/session\/\w+\/log\b/)) {
      // ignore polling requests for logs
      return;
    }

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
          attemptToCreateCommand(log, browserType, lifecycle, logPollingMs),
        ]);

        if (!command) {
          continue;
        }

        return command;
      }
    })(),
  ]);
}
