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
  }

  return new Screenshots();
}
