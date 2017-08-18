import { resolve, dirname } from 'path';
import fs from 'fs';
import {
  fromNode,
  promisify,
  fromNode as fcb
} from 'bluebird';
import imageDiff from 'image-diff';
import mkdirp from 'mkdirp';
import del from 'del';

const readFileAsync = promisify(fs.readFile);

export async function ScreenshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');
  const lifecycle = getService('lifecycle');

  const DIFF_DIRECTORY = resolve(config.get('screenshots.directory'), 'diffs');
  const BASELINE_DIRECTORY = resolve(config.get('screenshots.directory'), 'baseline');
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
        await fcb(cb => fs.writeFile(path, screenshot, cb));
      } catch (err) {
        log.error('SCREENSHOT FAILED');
        log.error(err);
      }
    }

    async compareAgainstBaseline(name) {
      // We're going to load image data and cache it in this object.
      const comparison = {
        name,
        change: undefined,
        percentage: undefined,
        imageData: {
          session: undefined,
          baseline: undefined,
          diff: undefined,
        }
      };

      const sessionImagePath = resolve(SESSION_DIRECTORY, name);
      const baselineImagePath = resolve(BASELINE_DIRECTORY, name);
      const diffImagePath = resolve(DIFF_DIRECTORY, name);

      // Diff the images asynchronously.
      const diffResult = await fromNode((cb) => {
        imageDiff.getFullResult({
          actualImage: sessionImagePath,
          expectedImage: baselineImagePath,
          diffImage: diffImagePath,
          shadow: true,
        }, cb);
      });

      const change = diffResult.percentage;
      const changePercentage = (change * 100).toFixed(2);
      log.debug(`(${changePercentage}%) ${name}`);
      comparison.percentage = changePercentage;
      comparison.change = change;

      // Once the images have been diffed, we can load and store the image data.
      comparison.imageData.session =
        await readFileAsync(sessionImagePath, 'base64');

      comparison.imageData.baseline =
        await readFileAsync(baselineImagePath, 'base64');

      comparison.imageData.diff =
        await readFileAsync(diffImagePath, 'base64');

      return comparison;
    }
  }

  const screenshots = new Screenshots();

  lifecycle
    .on('testFailure', (err, test) => screenshots.takeForFailure(test.fullTitle()))
    .on('testHookFailure', (err, test) => screenshots.takeForFailure(test.fullTitle()));

  return screenshots;
}
