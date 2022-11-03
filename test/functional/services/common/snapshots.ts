/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, resolve } from 'path';
import { writeFile, readFile, mkdir } from 'fs/promises';

import expect from '@kbn/expect';
import del from 'del';
import { FtrProviderContext, FtrService } from '../../ftr_provider_context';

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
      await writeFile(baselinePath, await readFile(sessionPath));
      return 0;
    } else {
      this.log.debug('comparing');
      return await this.compare(sessionPath, baselinePath);
    }
  }

  private async compare(sessionPath: string, baselinePath: string) {
    const currentObject = await readFile(sessionPath, { encoding: 'utf8' });
    const baselineObject = await readFile(baselinePath, { encoding: 'utf8' });
    expect(currentObject).to.eql(baselineObject);
    return 0;
  }

  public async take(name: string) {
    return await this._take(resolve(this.SESSION_DIRECTORY, `${name}.json`));
  }

  private async _take(path: string, snapshot?: object) {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(snapshot), 'utf8');
    } catch (err) {
      this.log.error('SNAPSHOT FAILED');
      this.log.error(err);
    }
  }
}
