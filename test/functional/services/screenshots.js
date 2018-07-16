import { resolve, dirname } from 'path';
import { writeFile, readFileSync } from 'fs';
import { fromNode as fcb, promisify } from 'bluebird';
import mkdirp from 'mkdirp';
import del from 'del';
import { comparePngs, getSize } from './lib/compare_pngs';

const mkdirAsync = promisify(mkdirp);
const writeFileAsync = promisify(writeFile);

export async function ScreenshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');

  const SESSION_DIRECTORY = resolve(config.get('screenshots.directory'), 'session');
  const FAILURE_DIRECTORY = resolve(config.get('screenshots.directory'), 'failure');
  const BASELINE_DIRECTORY = resolve(config.get('screenshots.directory'), 'baseline');
  await del([SESSION_DIRECTORY, FAILURE_DIRECTORY]);

  class Screenshots {

    /**
     *
     * @param name {string} name of the file to use for comparison
     * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
     * @return {Promise.<number>} Percentage difference between the baseline and the current snapshot.
     */
    async compareAgainstBaseline(name, updateBaselines) {
      log.debug('compareAgainstBaseline');
      const sessionPath = resolve(SESSION_DIRECTORY, `${name}.png`);
      await this._take(sessionPath);

      const baselinePath = resolve(BASELINE_DIRECTORY, `${name}.png`);
      const failurePath = resolve(FAILURE_DIRECTORY, `${name}.png`);

      if (updateBaselines) {
        log.debug('Updating baseline snapshot');
        await writeFileAsync(baselinePath, readFileSync(sessionPath));
        return 0;
      } else {
        await mkdirAsync(FAILURE_DIRECTORY);
        return await comparePngs(sessionPath, baselinePath, failurePath, SESSION_DIRECTORY, log);
      }
    }

    async take(name) {
      return await this._take(resolve(SESSION_DIRECTORY, `${name}.png`));
    }

    async takeForFailure(name) {
      await this._take(resolve(FAILURE_DIRECTORY, `${name}.png`));
    }

    async _take(path) {
      try {
        log.info(`Taking screenshot "${path}"`);
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

    async getScreenshotSize() {
      log.debug('getScreenshotSize');
      const sessionPath = resolve(SESSION_DIRECTORY, 'temp.png');
      await this._take(sessionPath);
      return await getSize(sessionPath);
    }



    /*
    The comparePngs function will try to scale images of mismatched
    sizes before doing the comparison, but the matching is much more accurate if
    the images are in the exact same aspect ratio.
    To accomadate for different browsers on different OSs, we can take a temp
    screenshot, get it's size, and then adjust our window size so that the screenshots
    will be an exact match (if the user's display scaling is 100%).
    If the display scaling is not 100%, we need to figure out what it is and use
    that in our new window size calculation.  For example, If I run this test with
    my display scaling set to 200%, the comparePngs will log this;
      expected height 686 and width 1280
      actual height 1372 and width 2560
    But that's OK, because that's exactly 200% of the baseline image size.
    */
    async calibrateForScreenshots(baselineImageSize) {
      // CALIBRATION STEP
      const initialSize = await remote.getWindowSize();
      // take a sample screenshot and get the size
      let currentSize = await this.getScreenshotSize();
      log.debug(`################## initial screenshot Size: ${currentSize.width} x ${currentSize.height}`);
      // determine if there is display scaling and if so, what it is
      log.debug(`current width / 1280 = ${currentSize.width / 1280}`);
      log.debug(`current width / 1252 = ${currentSize.width / 1252}`);

      await remote.setWindowSize(initialSize.width + 100, initialSize.height);
      const tempSize = await this.getScreenshotSize();
      log.debug(`################ temp  screenshot Size: ${currentSize.width} x ${currentSize.height}`);
      const ratio = (tempSize.width - currentSize.width) / 100;
      log.debug(`################ display scaling ratio = ${ratio}`);

      // calculate the new desired size using that ratio.
      const newSize = { width: (initialSize.width) + (baselineImageSize.width) - currentSize.width / ratio,
        height: (initialSize.height) + (baselineImageSize.height)  - currentSize.height / ratio };
      log.debug(`################## setting window size to ${newSize.width} x ${newSize.height}`);
      log.debug(`################## delta size to ${newSize.width - initialSize.width} x ${newSize.height - initialSize.height}`);
      await remote.setWindowSize(newSize.width, newSize.height);

      // check again.
      currentSize = await this.getScreenshotSize();
      log.debug(`################## second screenshot Size: ${currentSize.width} x ${currentSize.height}`);
    }




  }

  return new Screenshots();
}
