/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve, dirname } from 'path';
import { writeFile, readFileSync, mkdir } from 'fs';
import { promisify } from 'util';

import del from 'del';

import { comparePngs } from '../lib/compare_pngs';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

export async function ScreenshotsProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const failureMetadata = getService('failureMetadata');
  const browser = getService('browser');

  const SESSION_DIRECTORY = resolve(config.get('screenshots.directory'), 'session');
  const FAILURE_DIRECTORY = resolve(config.get('screenshots.directory'), 'failure');
  const BASELINE_DIRECTORY = resolve(config.get('screenshots.directory'), 'baseline');

  if (process.env.CI !== 'true' && !process.env.stack_functional_integration) {
    await del([SESSION_DIRECTORY, FAILURE_DIRECTORY]);
  }

  class Screenshots {
    /**
     *
     * @param name {string} name of the file to use for comparison
     * @param updateBaselines {boolean} optional, pass true to update the baseline snapshot.
     * @return {Promise.<number>} Percentage difference between the baseline and the current snapshot.
     */
    async compareAgainstBaseline(name: string, updateBaselines: boolean, el?: WebElementWrapper) {
      log.debug('compareAgainstBaseline');
      const sessionPath = resolve(SESSION_DIRECTORY, `${name}.png`);
      await this._take(sessionPath, el);

      const baselinePath = resolve(BASELINE_DIRECTORY, `${name}.png`);
      const failurePath = resolve(FAILURE_DIRECTORY, `${name}.png`);

      if (updateBaselines) {
        log.debug('Updating baseline snapshot');
        // Make the directory if it doesn't exist
        await mkdirAsync(dirname(baselinePath), { recursive: true });
        await writeFileAsync(baselinePath, readFileSync(sessionPath));
        return 0;
      } else {
        await mkdirAsync(FAILURE_DIRECTORY, { recursive: true });
        return await comparePngs(sessionPath, baselinePath, failurePath, SESSION_DIRECTORY, log);
      }
    }

    async take(name: string, el?: WebElementWrapper) {
      const path = resolve(SESSION_DIRECTORY, `${name}.png`);
      await this._take(path, el);
      failureMetadata.addScreenshot(name, path);
    }

    async takeForFailure(name: string, el?: WebElementWrapper) {
      const path = resolve(FAILURE_DIRECTORY, `${name}.png`);
      await this._take(path, el);
      failureMetadata.addScreenshot(`failure[${name}]`, path);
    }

    async _take(path: string, el?: WebElementWrapper) {
      try {
        log.info(`Taking screenshot "${path}"`);
        const screenshot = await (el ? el.takeScreenshot() : browser.takeScreenshot());
        await mkdirAsync(dirname(path), { recursive: true });
        await writeFileAsync(path, screenshot, 'base64');
      } catch (err) {
        log.error('SCREENSHOT FAILED');
        log.error(err);
      }
    }
  }

  return new Screenshots();
}
