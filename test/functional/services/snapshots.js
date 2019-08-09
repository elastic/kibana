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

import expect from '@kbn/expect';
import { dirname, resolve } from 'path';
import { writeFile, readFileSync } from 'fs';
import { fromNode as fcb, promisify } from 'bluebird';
import mkdirp from 'mkdirp';
import del from 'del';

const writeFileAsync = promisify(writeFile);

export async function SnapshotsProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');

  const SESSION_DIRECTORY = resolve(config.get('snapshots.directory'), 'session');
  const BASELINE_DIRECTORY = resolve(config.get('snapshots.directory'), 'baseline');
  await del([SESSION_DIRECTORY]);

  class Snapshots {

    /**
     *
     * @param name {string} name of the file to use for comparison
     * @param value {object} value to compare to baseline.
     * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
     * @return {Promise.<number>} returns 0 if successful.
     */
    async compareAgainstBaseline(name, value, updateBaselines) {
      log.debug('compareAgainstBaseline');
      const sessionPath = resolve(SESSION_DIRECTORY, `${name}.json`);
      await this._take(sessionPath, value);

      const baselinePath = resolve(BASELINE_DIRECTORY, `${name}.json`);

      if (updateBaselines) {
        await writeFileAsync(baselinePath, readFileSync(sessionPath));
        return 0;
      } else {
        log.debug('comparing');
        return this._compare(sessionPath, baselinePath);
      }
    }

    _compare(sessionPath, baselinePath) {
      const currentObject = readFileSync(sessionPath, { encoding: 'utf8' });
      const baselineObject = readFileSync(baselinePath, { encoding: 'utf8' });
      expect(currentObject).to.eql(baselineObject);
      return 0;
    }

    async take(name) {
      return await this._take(resolve(SESSION_DIRECTORY, `${name}.json`));
    }

    async _take(path, snapshot) {
      try {
        await fcb(cb => mkdirp(dirname(path), cb));
        await fcb(cb => writeFile(path, JSON.stringify(snapshot), 'utf8', cb));
      } catch (err) {
        log.error('SNAPSHOT FAILED');
        log.error(err);
      }
    }
  }

  return new Snapshots();
}
