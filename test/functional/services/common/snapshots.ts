/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, resolve } from 'path';
import { writeFile, readFileSync, mkdir } from 'fs';
import { promisify } from 'util';

import expect from '@kbn/expect';
import del from 'del';
import { FtrProviderContext, FtrService } from '../../ftr_provider_context';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

export class SnapshotsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly config = this.ctx.getService('config');

  private readonly SESSION_DIRECTORY = resolve(this.config.get('snapshots.directory'), 'session');
  private readonly BASELINE_DIRECTORY = resolve(this.config.get('snapshots.directory'), 'baseline');

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    if (process.env.CI !== 'true' && !process.env.stack_functional_integration) {
      ctx.getService('lifecycle').beforeTests.add(async () => {
        await del([this.SESSION_DIRECTORY]);
      });
    }
  }
  /**
   *
   * @param name {string} name of the file to use for comparison
   * @param value {object} value to compare to baseline.
   * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
   * @return {Promise.<number>} returns 0 if successful.
   */
  public async compareAgainstBaseline(name: string, value: object, updateBaselines?: boolean) {
    this.log.debug('compareAgainstBaseline');
    const sessionPath = resolve(this.SESSION_DIRECTORY, `${name}.json`);
    await this._take(sessionPath, value);

    const baselinePath = resolve(this.BASELINE_DIRECTORY, `${name}.json`);

    if (updateBaselines) {
      await writeFileAsync(baselinePath, readFileSync(sessionPath));
      return 0;
    } else {
      this.log.debug('comparing');
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
    return await this._take(resolve(this.SESSION_DIRECTORY, `${name}.json`));
  }

  private async _take(path: string, snapshot?: object) {
    try {
      await mkdirAsync(dirname(path), { recursive: true });
      await writeFileAsync(path, JSON.stringify(snapshot), 'utf8');
    } catch (err) {
      this.log.error('SNAPSHOT FAILED');
      this.log.error(err);
    }
  }
}
