import { resolve } from 'path';
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
  const remote = getService('remote');

  await del(config.get('failureDebugging.htmlDirectory'));

  async function logCurrentUrl() {
    const currentUrl = await remote.getCurrentUrl();
    log.info(`Current URL is: ${currentUrl}`);
  }

  async function savePageHtml(name) {
    await mkdirAsync(config.get('failureDebugging.htmlDirectory'));
    const htmlOutputFileName = resolve(config.get('failureDebugging.htmlDirectory'), `${name}.html`);
    const pageSource = await remote.getPageSource();
    log.info(`Saving page source to: ${htmlOutputFileName}`);
    await writeFileAsync(htmlOutputFileName, pageSource);
  }

  async function onFailure(error, test) {
    // Replace characters in test names which can't be used in filenames, like *
    const name = test.fullTitle().replace(/([^ a-zA-Z0-9/-]+)/g, '_');

    await Promise.all([
      screenshots.takeForFailure(name),
      logCurrentUrl(),
      savePageHtml(name)
    ]);
  }

  lifecycle
    .on('testFailure', onFailure)
    .on('testHookFailure', onFailure);
}
