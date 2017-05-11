import { resolve, dirname } from 'path';
import { writeFile } from 'fs';

import { fromNode as fcb } from 'bluebird';
import mkdirp from 'mkdirp';
import del from 'del';

export async function ScreenshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');
  const lifecycle = getService('lifecycle');

  const SESSION_DIRECTORY = resolve(config.get('screenshots.directory'), 'session');
  const FAILURE_DIRECTORY = resolve(config.get('screenshots.directory'), 'failure');
  await del([SESSION_DIRECTORY, FAILURE_DIRECTORY]);

  class Screenshots {
    async take(name) {
      return await this._take(resolve(SESSION_DIRECTORY, `${name}.png`));
    }

    async takeForFailure(name) {
      return await this._take(resolve(FAILURE_DIRECTORY, `${name}.png`));
    }

    async _take(path) {
      try {
        log.debug(`Taking screenshot "${path}"`);
        const [screenshot] = await Promise.all([
          remote.takeScreenshot(),
          fcb(cb => mkdirp(dirname(path), cb)),
        ]);
        await fcb(cb => writeFile(path, screenshot, cb));
      } catch (err) {
        log.error('SCREENSHOT FAILED');
        log.error(err);
      }
    }
  }

  const screenshots = new Screenshots();

  lifecycle
    .on('testFailure', (err, test) => screenshots.takeForFailure(test.fullTitle()))
    .on('testHookFailure', (err, test) => screenshots.takeForFailure(test.fullTitle()));

  return screenshots;
}
