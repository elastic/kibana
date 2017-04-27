import { delay, promisify } from 'bluebird';
import fs from 'fs';
import mkdirp from 'mkdirp';
import { resolve } from 'path';

import getUrl from '../../utils/get_url';

const mkdirpAsync = promisify(mkdirp);
const writeFileAsync = promisify(fs.writeFile);

export function CommonPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['shield']);

  const screenshotDirectory = config.get('screenshots.directory');
  const defaultTryTimeout = config.get('timeouts.try');
  const defaultFindTimeout = config.get('timeouts.find');

  class CommonPage {
    getHostPort() {
      return getUrl.baseUrl(config.get('servers.kibana'));
    }

    getEsHostPort() {
      return getUrl.baseUrl(config.get('servers.elasticsearch'));
    }

    navigateToUrl(appName, subUrl) {
      const appConfig = Object.assign({}, config.get(['apps', appName]), {
        // Overwrite the default hash with the URL we really want.
        hash: `${appName}/${subUrl}`,
      });

      const appUrl = getUrl.noAuth(config.get('servers.kibana'), appConfig);
      return remote.get(appUrl);
    }

    navigateToApp(appName) {
      const self = this;
      const appUrl = getUrl.noAuth(config.get('servers.kibana'), config.get(['apps', appName]));
      log.debug('navigating to ' + appName + ' url: ' + appUrl);

      function navigateTo(url) {
        return retry.try(function () {
          // since we're using hash URLs, always reload first to force re-render
          return kibanaServer.uiSettings.getDefaultIndex()
          .then(function (defaultIndex) {
            if (appName === 'discover' || appName === 'visualize' || appName === 'dashboard') {
              if (!defaultIndex) {
                // https://github.com/elastic/kibana/issues/7496
                // Even though most tests are using esClient to set the default index, sometimes Kibana clobbers
                // that change.  If we got here, fix it.
                log.debug(' >>>>>>>> WARNING Navigating to [' + appName + '] with defaultIndex=' + defaultIndex);
                log.debug(' >>>>>>>> Setting defaultIndex to "logstash-*""');
                return kibanaServer.uiSettings.update({
                  'dateFormat:tz':'UTC',
                  'defaultIndex':'logstash-*'
                });
              }
            }
          })
          .then(function () {
            log.debug('navigate to: ' + url);
            return remote.get(url);
          })
          .then(function () {
            return self.sleep(700);
          })
          .then(function () {
            log.debug('returned from get, calling refresh');
            return remote.refresh();
          })
          .then(function () {
            return remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            const loginPage = currentUrl.includes('/login');
            const wantedLoginPage = appUrl.includes('/login') || appUrl.includes('/logout');
            if (loginPage && !wantedLoginPage) {
              log.debug('Found loginPage username = '
                + config.get('servers.kibana.username'));
              return PageObjects.shield.login(config.get('servers.kibana.username'),
                config.get('servers.kibana.password'))
              .then(function () {
                return remote.getCurrentUrl();
              });
            } else {
              return currentUrl;
            }
          })
          .then(function (currentUrl) {
            currentUrl = currentUrl.replace(/\/\/\w+:\w+@/, '//');
            const maxAdditionalLengthOnNavUrl = 230;
            // On several test failures at the end of the TileMap test we try to navigate back to
            // Visualize so we can create the next Vertical Bar Chart, but we can see from the
            // logging and the screenshot that it's still on the TileMap page. Why didn't the "get"
            // with a new timestamped URL go? I thought that sleep(700) between the get and the
            // refresh would solve the problem but didn't seem to always work.
            // So this hack fails the navSuccessful check if the currentUrl doesn't match the
            // appUrl plus up to 230 other chars.
            // Navigating to Settings when there is a default index pattern has a URL length of 196
            // (from debug output). Some other tabs may also be long. But a rather simple configured
            // visualization is about 1000 chars long. So at least we catch that case.

            // Browsers don't show the ':port' if it's 80 or 443 so we have to
            // remove that part so we can get a match in the tests.
            const navSuccessful = new RegExp(appUrl.replace(':80','').replace(':443','')
             + '.{0,' + maxAdditionalLengthOnNavUrl + '}$')
            .test(currentUrl);

            if (!navSuccessful) {
              const msg = 'App failed to load: ' + appName +
              ' in ' + defaultFindTimeout + 'ms' +
              ' appUrl = ' + appUrl +
              ' currentUrl = ' + currentUrl;
              log.debug(msg);
              throw new Error(msg);
            }

            return currentUrl;
          });
        });
      }

      return retry.tryForTime(defaultTryTimeout * 3, () => {
        return navigateTo(appUrl)
        .then(function (currentUrl) {
          let lastUrl = currentUrl;
          return retry.try(function () {
            // give the app time to update the URL
            return self.sleep(501)
            .then(function () {
              return remote.getCurrentUrl();
            })
            .then(function (currentUrl) {
              log.debug('in navigateTo url = ' + currentUrl);
              if (lastUrl !== currentUrl) {
                lastUrl = currentUrl;
                throw new Error('URL changed, waiting for it to settle');
              }
            });
          });
        })
        .then(async () => {
          if (appName === 'status_page') return;
          if (await testSubjects.exists('statusPageContainer')) {
            throw new Error('Navigation ended up at the status page.');
          }
        });
      });
    }

    runScript(fn, timeout = 10000) {
      // wait for deps on window before running script
      return remote
      .setExecuteAsyncTimeout(timeout)
      .executeAsync(function (done) {
        const interval = setInterval(function () {
          const ready = (document.readyState === 'complete');
          const hasJQuery = !!window.$;

          if (ready && hasJQuery) {
            console.log('doc ready, jquery loaded');
            clearInterval(interval);
            done();
          }
        }, 10);
      }).then(function () {
        return remote.execute(fn);
      });
    }

    async sleep(sleepMilliseconds) {
      log.debug('... sleep(' + sleepMilliseconds + ') start');
      await delay(sleepMilliseconds);
      log.debug('... sleep(' + sleepMilliseconds + ') end');
    }

    createErrorHandler(testObj) {
      const testName = (testObj.parent) ? [testObj.parent.name, testObj.name].join('_') : testObj.name;
      return error => {
        const now = Date.now();
        const fileName = `failure_${now}_${testName}`;

        return this.saveScreenshot(fileName, true)
        .then(function () {
          throw error;
        });
      };
    }

    async saveScreenshot(fileName, isFailure = false) {
      try {
        const type = isFailure ? 'failure' : 'session';
        const directory = resolve(screenshotDirectory, type);
        const path = resolve(directory, `${fileName}.png`);
        log.debug(`Taking screenshot "${path}"`);

        const screenshot = await remote.takeScreenshot();
        await mkdirpAsync(directory);
        await writeFileAsync(path, screenshot);
      } catch (err) {
        log.warning(`SCREENSHOT FAILED: ${err}`);
      }
    }

    async waitUntilUrlIncludes(path) {
      await retry.try(async () => {
        const url = await remote.getCurrentUrl();
        if (!url.includes(path)) {
          throw new Error('Url not found');
        }
      });
    }

    async getSharedItemTitleAndDescription() {
      const element = await remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[data-shared-item]');

      return {
        title: await element.getAttribute('data-title'),
        description: await element.getAttribute('data-description')
      };
    }

    /**
     * Makes sure the modal overlay is not showing, tries a few times in case it is in the process of hiding.
     */
    async ensureModalOverlayHidden() {
      return retry.try(async () => {
        const shown = await testSubjects.exists('modalOverlay');
        if (shown) {
          throw new Error('Modal overlay is showing');
        }
      });
    }

    async clickConfirmOnModal() {
      log.debug('Clicking modal confirm');
      await testSubjects.click('confirmModalConfirmButton');
      await this.ensureModalOverlayHidden();
    }

    async clickCancelOnModal() {
      log.debug('Clicking modal cancel');
      await testSubjects.click('confirmModalCancelButton');
      await this.ensureModalOverlayHidden();
    }

    async isConfirmModalOpen() {
      const isOpen = await testSubjects
      .find('confirmModalCancelButton', 2000)
      .then(() => true, () => false);

      await remote.setFindTimeout(defaultFindTimeout);
      return isOpen;
    }

    async doesCssSelectorExist(selector) {
      log.debug(`doesCssSelectorExist ${selector}`);

      const exists = await remote
        .setFindTimeout(1000)
        .findByCssSelector(selector)
        .then(() => true)
        .catch(() => false);

      remote.setFindTimeout(defaultFindTimeout);

      log.debug(`exists? ${exists}`);
      return exists;
    }
  }

  return new CommonPage();
}
