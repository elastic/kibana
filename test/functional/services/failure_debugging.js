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

import { resolve, relative } from 'path';
import { writeFile } from 'fs';
import mkdirp from 'mkdirp';
import del from 'del';
import { promisify } from 'bluebird';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdirp);

export async function FailureDebuggingProvider({ getService }) {
  const screenshots = getService('screenshots');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const browser = getService('browser');

  await del(config.get('failureDebugging.htmlDirectory'));

  async function logCurrentUrl(test) {
    const currentUrl = await browser.getCurrentUrl();
    test.addl.currentUrl = currentUrl;
    log.info(`Current URL is: ${currentUrl}`);
  }

  async function savePageHtml(name, test) {
    await mkdirAsync(config.get('failureDebugging.htmlDirectory'));
    const htmlOutputFileName = resolve(config.get('failureDebugging.htmlDirectory'), `${name}.html`);
    const pageSource = await browser.getPageSource();
    test.addl.htmlFileName = `https://storage.googleapis.com/kibana-ci-artifacts/jobs/elastic+kibana+pull-request/${process.env.JOB_BASE_NAME}/${process.env.BUILD_ID}/kibana/${htmlOutputFileName}`;
    log.info(`Saving page source to: ${htmlOutputFileName}`);
    await writeFileAsync(htmlOutputFileName, pageSource);
  }

  async function logBrowserConsole(test) {
    const browserLogs = await browser.getLogsFor('browser');
    const browserOutput = browserLogs.reduce((acc, log) => acc += `${log.message.replace(/\\n/g, '\n')}\n`, '');
    test.addl.browserOutput = browserOutput;
    log.info(`Browser output is: ${browserOutput}`);
  }

  async function onFailure(error, test) {
    // Replace characters in test names which can't be used in filenames, like *
    const name = test.fullTitle().replace(/([^ a-zA-Z0-9-]+)/g, '_');

    test.addl = {};

    await Promise.all([
      screenshots.takeForFailure(name, undefined, test),
      logCurrentUrl(test),
      savePageHtml(name, test),
      logBrowserConsole(test),
    ]);
  }

  lifecycle
    .on('testFailure', onFailure)
    .on('testHookFailure', onFailure);

  return {
    logBrowserConsole
  };
}
