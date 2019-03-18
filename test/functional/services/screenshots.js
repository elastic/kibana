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

import { resolve, dirname } from 'path';
import { writeFile, readFileSync } from 'fs';
import { fromNode as fcb, promisify } from 'bluebird';
import mkdirp from 'mkdirp';
import del from 'del';
import { comparePngs } from './lib/compare_pngs';
import { createCanvas, Image } from 'canvas';

const mkdirAsync = promisify(mkdirp);
const writeFileAsync = promisify(writeFile);

const BASE64_IMAGE_PREFIX = 'data:image/png;base64,';


function takeScreenshotOfArea({ x, y, width, height }, browser) {

  x = x || 0;
  y = y || 0;

  let currentScrollTop;
  let currentScrollLeft;

  return Promise
    .all([
      browser.setScrollTop(y),
      browser.setScrollLeft(x)
    ])
    .then(dataList => {

      currentScrollTop = dataList[0];
      currentScrollLeft = dataList[1];

      return browser.takeScreenshot();

    })
    .then(image => {
      const deltaScrollTop = 2 * y - currentScrollTop;
      const deltaScrollLeft = 2 * x - currentScrollLeft;
      const canvas = createCanvas(width * 2, height * 2);
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.src = BASE64_IMAGE_PREFIX + image;

      console.log('scroll top', deltaScrollLeft, deltaScrollTop);

      ctx.drawImage(img, -deltaScrollLeft, -deltaScrollTop, img.width, img.height);

      return canvas.toBuffer();

    });

}

export async function ScreenshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const browser = getService('browser');

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
    async compareAgainstBaseline(name, updateBaselines, el) {
      log.debug('compareAgainstBaseline');
      const sessionPath = resolve(SESSION_DIRECTORY, `${name}.png`);
      await this._take(sessionPath, el);

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

    async take(name, el) {
      return await this._take(resolve(SESSION_DIRECTORY, `${name}.png`), el);
    }

    async takeForFailure(name, el) {
      await this._take(resolve(FAILURE_DIRECTORY, `${name}.png`), el);
    }

    async _take(path, el) {
      try {
        log.info(`Taking screenshot "${path}"`);
        let screenshot;
        if (el) {
          const position = await el.getPosition();
          log.debug('element position:', position);
          screenshot = await takeScreenshotOfArea(position, browser);
        } else {
          screenshot = await browser.takeScreenshot();
        }
        await fcb(cb => mkdirp(dirname(path), cb));
        await fcb(cb => writeFile(path, screenshot, 'base64', cb));
      } catch (err) {
        log.error('SCREENSHOT FAILED');
        log.error(err);
      }
    }
  }

  return new Screenshots();
}
