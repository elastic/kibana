import { spawn } from 'child_process';
import { parse as parseUrl } from 'url';

import treeKill from 'tree-kill';
import { delay, fromNode as fcb } from 'bluebird';
import { path as CHROMEDRIVER_EXEC } from 'chromedriver';

import { ping } from './ping';
import { ChromedriverApi } from './chromedriver_api';
const START_TIMEOUT = 15000;
const PING_INTERVAL = 500;

export function createLocalChromedriverApi(log, url) {
  let proc = null;

  return new ChromedriverApi({
    url,

    async start(api) {
      const { port } = parseUrl(url);
      log.info('Starting local chromedriver at port %d', port);

      proc = spawn(CHROMEDRIVER_EXEC, [`--port=${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', chunk => {
        log.debug('[chromedriver:stdout]', chunk.toString('utf8').trim());
      });
      proc.stderr.on('data', chunk => {
        log.debug('[chromedriver:stderr]', chunk.toString('utf8').trim());
      });

      proc.on('exit', (code) => {
        if (!api.isStopped() || code > 0) {
          api.emit('error', new Error(`Chromedriver exited with code ${code}`));
        }
      });

      const pingsStartedAt = Date.now();
      while (true) {
        log.debug('[chromedriver:ping] attempting to reach chromedriver at %j', url);
        if (await ping(url)) {
          // chromedriver is running and accepting connections
          break;
        }

        if ((Date.now() - pingsStartedAt) < START_TIMEOUT) {
          // chromedriver did not respond, wait for PING_INTERVAL and then try again
          await delay(PING_INTERVAL);
          continue;
        }

        throw new Error(`Chromedriver did not start within the ${START_TIMEOUT}ms timeout`);
      }
    },

    async stop() {
      await fcb(cb => treeKill(proc.pid, undefined, cb));
    }
  });
}
