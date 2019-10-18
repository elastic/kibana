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

import { dirname, resolve } from 'path';
import { writeFile, readFileSync, mkdir } from 'fs';
import { promisify } from 'util';

import expect from '@kbn/expect';
import del from 'del';
import { FtrProviderContext } from '../ftr_provider_context';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

export async function SnapshotsProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  const SESSION_DIRECTORY = resolve(config.get('snapshots.directory'), 'session');
  const BASELINE_DIRECTORY = resolve(config.get('snapshots.directory'), 'baseline');

  if (process.env.CI !== 'true') {
    await del([SESSION_DIRECTORY]);
  }

  class Snapshots {
    /**
     *
     * @param name {string} name of the file to use for comparison
     * @param value {object} value to compare to baseline.
     * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
     * @return {Promise.<number>} returns 0 if successful.
     */
    public async compareAgainstBaseline(name: string, value: object, updateBaselines?: boolean) {
      log.debug('compareAgainstBaseline');
      const sessionPath = resolve(SESSION_DIRECTORY, `${name}.json`);
      await this._take(sessionPath, value);

      const baselinePath = resolve(BASELINE_DIRECTORY, `${name}.json`);

      if (updateBaselines) {
        await writeFileAsync(baselinePath, readFileSync(sessionPath));
        return 0;
      } else {
        log.debug('comparing');
        return this.compare(sessionPath, baselinePath);
      }
    }

    private compare(sessionPath: string, baselinePath: string) {
      const currentObject = readFileSync(sessionPath, { encoding: 'utf8' });
      const baselineObject = readFileSync(baselinePath, { encoding: 'utf8' });
      expect(currentObject).to.eql(baselineObject);
      return 0;
    }

    public async take(name: string) {
      return await this._take(resolve(SESSION_DIRECTORY, `${name}.json`));
    }

    private async _take(path: string, snapshot?: object) {
      try {
        await mkdirAsync(dirname(path), { recursive: true });
        await writeFileAsync(path, JSON.stringify(snapshot), 'utf8');
      } catch (err) {
        log.error('SNAPSHOT FAILED');
        log.error(err);
      }
    }
  }

  return new Snapshots();
}
