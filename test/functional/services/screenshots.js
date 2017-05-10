import { fromNode as fcb } from 'bluebird';
import { writeFile } from 'fs';
import mkdirp from 'mkdirp';
import { resolve } from 'path';

export function ScreenshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');

  const directory = config.get('screenshots.directory');

  class Screenshots {
    async take(name) {
      return await this._take(resolve(directory, 'session', `${name}.png`));
    }

    async takeForFailure(name) {
      return await this._take(resolve(directory, 'failure', `${name}.png`));
    }

    async _take(path) {
      try {
        log.debug(`Taking screenshot "${path}"`);
        const screenshot = await remote.takeScreenshot();
        await fcb(cb => mkdirp(directory, cb));
        await fcb(cb => writeFile(path, screenshot, cb));
      } catch (err) {
        log.error('SCREENSHOT FAILED');
        log.error(err);
      }
    }
  }

  return new Screenshots();
}
