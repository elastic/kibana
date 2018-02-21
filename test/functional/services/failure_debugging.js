import { resolve } from 'path';
import { writeFile } from 'fs';

import { promisify } from 'bluebird';

const writeFileAsync = promisify(writeFile);

export function FailureDebuggingProvider({ getService }) {
  const screenshots = getService('screenshots');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const remote = getService('remote');

  async function logCurrentUrl() {
    const currentUrl = await remote.getCurrentUrl();
    log.info(`Current URL is: ${currentUrl}`);
  }

  async function savePageHtml(name) {
    const htmlOutputFileName = resolve(config.get('failureDebugging.htmlDirectory'), `${name}.html`);
    const pageSource = await remote.getPageSource();
    log.info(`Saving page source to: ${htmlOutputFileName}`);
    await writeFileAsync(htmlOutputFileName, pageSource);
  }

  async function onFailure(error, test) {
    // TODO: Replace characters in test names which can't be used in filenames, like *
    const name = test.fullTitle();

    await Promise.all([
      screenshots.takeForFailure(name),
      savePageHtml(name),
      logCurrentUrl()
    ]);
  }

  lifecycle
    .on('testFailure', onFailure)
    .on('testHookFailure', onFailure);
}
