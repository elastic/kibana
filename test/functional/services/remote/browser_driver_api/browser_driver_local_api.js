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

import { spawn } from 'child_process';
import { parse as parseUrl } from 'url';

import treeKill from 'tree-kill';
import { delay, fromNode as fcb } from 'bluebird';
import { path as CHROMEDRIVER_EXEC } from 'chromedriver';
import { path as FIREFOXDRIVER_EXEC } from 'geckodriver';

import { ping } from './ping';
import { BrowserDriverApi } from './browser_driver_api';
const START_TIMEOUT = 15000;
const PING_INTERVAL = 500;

export function createLocalBrowserDriverApi(log, url, browser) {
  let runningDriver = null;
  const driverName = browser + 'driver';
  switch (browser) {
    case 'firefox':
      runningDriver = FIREFOXDRIVER_EXEC;
      break;
    default:
      runningDriver = CHROMEDRIVER_EXEC;
  }
  let proc = null;

  return new BrowserDriverApi({
    url,
    requiredCapabilities: Object.create({ browserType: browser }),

    async start(api) {
      const { port } = parseUrl(url);
      log.debug('Starting local ' + driverName + ' at port %d', port);

      proc = spawn(runningDriver, [`--port=${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', chunk => {
        log.debug('[' + driverName + ':stdout]', chunk.toString('utf8').trim());
      });
      proc.stderr.on('data', chunk => {
        log.debug('[' + driverName + ':stderr]', chunk.toString('utf8').trim());
      });

      proc.on('exit', (code) => {
        if (!api.isStopped() && code > 0) {
          api.emit('error', new Error(driverName + ` exited with code ${code}`));
        }
      });

      const pingsStartedAt = Date.now();
      while (true) {
        log.debug('[' + driverName + ':ping] attempting to reach at %j', url);
        if (await ping(url)) {
          log.debug('[' + driverName + ':ping] success');
          break;
        } else {
          log.debug('[' + driverName + ':ping] failure');
        }

        if ((Date.now() - pingsStartedAt) < START_TIMEOUT) {
          log.debug('[' + driverName + ':ping] waiting for %d before next ping', PING_INTERVAL);
          await delay(PING_INTERVAL);
          continue;
        }

        throw new Error(driverName + ` did not start within the ${START_TIMEOUT}ms timeout`);
      }
    },

    async stop() {
      await fcb(cb => treeKill(proc.pid, undefined, cb));
    }
  });
}
