import { spawn } from 'child_process';
import { parse as parseUrl } from 'url';

import treeKill from 'tree-kill';
import { delay, fromNode as fcb } from 'bluebird';
import { path as CHROMEDRIVER_EXEC } from 'chromedriver';
import { path as FIREFOXDRIVER_EXEC } from 'geckodriver';

import { ping } from './ping';
import { BrowserdriverApi } from './browserdriver_api';
const START_TIMEOUT = 15000;
const PING_INTERVAL = 500;

export function createLocalBrowserdriverApi(log, url, browser) {
  let runningDriver = null;
  const driverName = browser + 'driver';
  switch (browser) {
    case 'firefox':
      runningDriver = FIREFOXDRIVER_EXEC;
      break;
    default:
      runningDriver = CHROMEDRIVER_EXEC;
  }

  log.debug(FIREFOXDRIVER_EXEC);
  log.debug(CHROMEDRIVER_EXEC);
  let proc = null;

  return new BrowserdriverApi({
    url,
    browser,

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
        if (!api.isStopped() || code > 0) {
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
