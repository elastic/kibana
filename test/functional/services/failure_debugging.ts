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

import { resolve } from 'path';
import { writeFile, mkdir } from 'fs';
import { promisify } from 'util';

import del from 'del';
import { FtrProviderContext } from '../ftr_provider_context';

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

  if (process.env.CI !== 'true') {
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
    // Replace characters in test names which can't be used in filenames, like *
    const name = test.fullTitle().replace(/([^ a-zA-Z0-9-]+)/g, '_');

    await Promise.all([screenshots.takeForFailure(name), logCurrentUrl(), savePageHtml(name)]);
  }

  lifecycle.testFailure.add(onFailure);
  lifecycle.testHookFailure.add(onFailure);
}
