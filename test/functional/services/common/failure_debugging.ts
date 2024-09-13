/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { writeFile, mkdir } from 'fs';
import { promisify } from 'util';

import del from 'del';
import { FtrScreenshotFilename } from '@kbn/ftr-screenshot-filename';
import { FtrProviderContext } from '../../ftr_provider_context';

interface Test {
  fullTitle(): string;
}

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

export async function FailureDebuggingProvider({ getService }: FtrProviderContext) {
  const screenshots = getService('screenshots');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const browser = getService('browser');

  if (process.env.CI !== 'true' && !process.env.stack_functional_integration) {
    await del(config.get('failureDebugging.htmlDirectory'));
  }

  async function logCurrentUrl() {
    const currentUrl = await browser.getCurrentUrl();
    log.info(`Current URL is: ${currentUrl}`);
  }

  async function savePageHtml(name: string) {
    await mkdirAsync(config.get('failureDebugging.htmlDirectory'), { recursive: true });
    const htmlOutputFileName = resolve(
      config.get('failureDebugging.htmlDirectory'),
      `${name}.html`
    );
    const pageSource = await browser.getPageSource();
    log.info(`Saving page source to: ${htmlOutputFileName}`);
    await writeFileAsync(htmlOutputFileName, pageSource);
  }

  async function onFailure(_: any, test: Test) {
    const name = FtrScreenshotFilename.create(test.fullTitle(), { ext: false });
    const hasOpenWindow = await browser.hasOpenWindow();
    if (hasOpenWindow) {
      await Promise.all([screenshots.takeForFailure(name), logCurrentUrl(), savePageHtml(name)]);
    } else {
      log.error('Browser is closed, no artifacts were captured for the failure');
    }
  }

  lifecycle.testFailure.add(onFailure);
  lifecycle.testHookFailure.add(onFailure);
}
