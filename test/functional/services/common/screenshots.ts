/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, dirname } from 'path';
import { writeFile, readFileSync, mkdir } from 'fs';
import { promisify } from 'util';

import del from 'del';

import { comparePngs } from '../lib/compare_pngs';
import { FtrProviderContext, FtrService } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

export class ScreenshotsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly config = this.ctx.getService('config');
  private readonly testMetadata = this.ctx.getService('testMetadata');
  private readonly browser = this.ctx.getService('browser');

  private readonly SESSION_DIRECTORY = resolve(this.config.get('screenshots.directory'), 'session');
  private readonly FAILURE_DIRECTORY = resolve(this.config.get('screenshots.directory'), 'failure');
  private readonly BASELINE_DIRECTORY = resolve(
    this.config.get('screenshots.directory'),
    'baseline'
  );

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    if (process.env.CI !== 'true' && !process.env.stack_functional_integration) {
      ctx.getService('lifecycle').beforeTests.add(async () => {
        await del([this.SESSION_DIRECTORY, this.FAILURE_DIRECTORY]);
      });
    }
  }

  /**
   *
   * @param name {string} name of the file to use for comparison
   * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
   * @return {Promise.<number>} Percentage difference between the baseline and the current snapshot.
   */
  async compareAgainstBaseline(name: string, updateBaselines: boolean, el?: WebElementWrapper) {
    this.log.debug('compareAgainstBaseline');
    const sessionPath = resolve(this.SESSION_DIRECTORY, `${name}.png`);
    const baselinePath = resolve(this.BASELINE_DIRECTORY, `${name}.png`);
    const failurePath = resolve(this.FAILURE_DIRECTORY, `${name}.png`);

    await this.capture({
      path: sessionPath,
      name,
      el,
      baselinePath,
      failurePath,
    });

    if (updateBaselines) {
      this.log.debug('Updating baseline snapshot');
      // Make the directory if it doesn't exist
      await mkdirAsync(dirname(baselinePath), { recursive: true });
      await writeFileAsync(baselinePath, readFileSync(sessionPath));
      return 0;
    } else {
      await mkdirAsync(this.FAILURE_DIRECTORY, { recursive: true });
      return await comparePngs(
        sessionPath,
        baselinePath,
        failurePath,
        this.SESSION_DIRECTORY,
        this.log
      );
    }
  }

  async take(name: string, el?: WebElementWrapper, subDirectories: string[] = []) {
    const path = resolve(this.SESSION_DIRECTORY, ...subDirectories, `${name}.png`);
    await this.capture({ path, name, el });
  }

  async takeForFailure(name: string, el?: WebElementWrapper) {
    const path = resolve(this.FAILURE_DIRECTORY, `${name}.png`);
    await this.capture({
      path,
      name: `failure[${name}]`,
      el,
    });
  }

  private async capture({
    path,
    el,
    name,
    baselinePath,
    failurePath,
  }: {
    path: string;
    name: string;
    el?: WebElementWrapper;
    baselinePath?: string;
    failurePath?: string;
  }) {
    try {
      this.log.info(`Taking screenshot "${path}"`);
      const screenshot = await (el ? el.takeScreenshot() : this.browser.takeScreenshot());
      await mkdirAsync(dirname(path), { recursive: true });
      await writeFileAsync(path, screenshot, 'base64');
      this.testMetadata.addScreenshot({
        name,
        base64Png: Buffer.isBuffer(screenshot) ? screenshot.toString('base64') : screenshot,
        baselinePath,
        failurePath,
      });
    } catch (err) {
      this.log.error('SCREENSHOT FAILED');
      this.log.error(err);
    }
  }
}
