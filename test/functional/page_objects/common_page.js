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

import { delay } from 'bluebird';
import expect from '@kbn/expect';
import fetch from 'node-fetch';
import getUrl from '../../../src/test_utils/get_url';

export function CommonPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const config = getService('config');
  const browser = getService('browser');
  const retry = getService('retry');
  const find = getService('find');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['shield']);

  const defaultTryTimeout = config.get('timeouts.try');
  const defaultFindTimeout = config.get('timeouts.find');

  class CommonPage {

    static async navigateToUrlAndHandleAlert(url, shouldAcceptAlert) {
      log.debug('Navigate to: ' + url);
      try {
        await browser.get(url);
      } catch(navigationError) {
        log.debug('Error navigating to url');
        const alert = await browser.getAlert();
        if (alert && alert.accept) {
          if (shouldAcceptAlert) {
            log.debug('Should accept alert');
            try {
              await alert.accept();
            } catch(alertException) {
              log.debug('Error accepting alert');
              throw alertException;
            }
          } else {
            log.debug('Will not accept alert');
            throw navigationError;
          }
        } else {
          throw navigationError;
        }
      }
    }

    getHostPort() {
      return getUrl.baseUrl(config.get('servers.kibana'));
    }

    getEsHostPort() {
      return getUrl.baseUrl(config.get('servers.elasticsearch'));
    }

    /**
     * @param {string} appName As defined in the apps config
     * @param {string} subUrl The route after the hash (#)
     */
    async navigateToUrl(appName, subUrl, {
      basePath = '',
      ensureCurrentUrl = true,
      shouldLoginIfPrompted = true,
      shouldAcceptAlert = true
    } = {}) {
      // we onlt use the pathname from the appConfig and use the subUrl as the hash
      const appConfig = {
        pathname: `${basePath}${config.get(['apps', appName]).pathname}`,
        hash: `/${appName}/${subUrl}`,
      };

      const appUrl = getUrl.noAuth(config.get('servers.kibana'), appConfig);

      await retry.try(async () => {
        await CommonPage.navigateToUrlAndHandleAlert(appUrl, shouldAcceptAlert);
        const currentUrl = shouldLoginIfPrompted ? await this.loginIfPrompted(appUrl) : await browser.getCurrentUrl();

        if (ensureCurrentUrl && !currentUrl.includes(appUrl)) {
          throw new Error(`expected ${currentUrl}.includes(${appUrl})`);
        }
      });
    }

    /**
     * @param {string} appName As defined in the apps config
     * @param {string} hash The route after the hash (#)
     */
    async navigateToActualUrl(appName, hash, {
      basePath = '',
      ensureCurrentUrl = true,
      shouldLoginIfPrompted = true
    } = {}) {
      // we only use the apps config to get the application path
      const appConfig = {
        pathname: `${basePath}${config.get(['apps', appName]).pathname}`,
        hash,
      };

      const appUrl = getUrl.noAuth(config.get('servers.kibana'), appConfig);
      await retry.try(async () => {
        log.debug(`navigateToActualUrl ${appUrl}`);
        await browser.get(appUrl);

        const currentUrl = shouldLoginIfPrompted ? await this.loginIfPrompted(appUrl) : await browser.getCurrentUrl();

        if (ensureCurrentUrl && !currentUrl.includes(appUrl)) {
          throw new Error(`expected ${currentUrl}.includes(${appUrl})`);
        }
      });
    }


    async loginIfPrompted(appUrl) {
      let currentUrl = await browser.getCurrentUrl();
      log.debug(`currentUrl = ${currentUrl}\n    appUrl = ${appUrl}`);
      await find.byCssSelector('[data-test-subj="kibanaChrome"]', defaultTryTimeout * 2);
      const loginPage = currentUrl.includes('/login');
      const wantedLoginPage = appUrl.includes('/login') || appUrl.includes('/logout');

      if (loginPage && !wantedLoginPage) {
        log.debug(`Found login page.  Logging in with username = ${config.get('servers.kibana.username')}`);
        await PageObjects.shield.login(
          config.get('servers.kibana.username'),
          config.get('servers.kibana.password')
        );
        await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide)', 20000);
        await browser.get(appUrl);
        currentUrl = await browser.getCurrentUrl();
        log.debug(`Finished login process currentUrl = ${currentUrl}`);
      }
      return currentUrl;
    }

    navigateToApp(appName, { basePath = '', shouldLoginIfPrompted = true, shouldAcceptAlert = true, hash = '' } = {}) {
      const self = this;

      let appUrl;
      if (config.has(['apps', appName])) {
        // Legacy applications
        const appConfig = config.get(['apps', appName]);
        appUrl = getUrl.noAuth(config.get('servers.kibana'), {
          pathname: `${basePath}${appConfig.pathname}`,
          hash: hash || appConfig.hash,
        });
      } else {
        appUrl = getUrl.noAuth(config.get('servers.kibana'), {
          pathname: `${basePath}/app/${appName}`,
          hash
        });
      }

      log.debug('navigating to ' + appName + ' url: ' + appUrl);

      function navigateTo(url) {
        return retry.try(function () {
          // since we're using hash URLs, always reload first to force re-render
          return kibanaServer.uiSettings.getDefaultIndex()
            .then(async function () {
              return await CommonPage.navigateToUrlAndHandleAlert(url, shouldAcceptAlert);
            })
            .then(function () {
              return self.sleep(700);
            })
            .then(function () {
              log.debug('returned from get, calling refresh');
              return browser.refresh();
            })
            .then(async function () {
              const currentUrl = shouldLoginIfPrompted ? await self.loginIfPrompted(appUrl) : browser.getCurrentUrl();

              if (currentUrl.includes('app/kibana')) {
                await testSubjects.find('kibanaChrome');
              }
            })
            .then(async function () {

              const currentUrl = (await browser.getCurrentUrl()).replace(/\/\/\w+:\w+@/, '//');
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
              const navSuccessful = new RegExp(appUrl.replace(':80/', '/').replace(':443/', '/')
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
                  return browser.getCurrentUrl();
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

    async waitUntilUrlIncludes(path) {
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        if (!url.includes(path)) {
          throw new Error('Url not found');
        }
      });
    }

    async getSharedItemTitleAndDescription() {
      const cssSelector = '[data-shared-item][data-title][data-description]';
      const element = await find.byCssSelector(cssSelector);

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
        const shown = await testSubjects.exists('confirmModalTitleText');
        if (shown) {
          throw new Error('Modal overlay is showing');
        }
      });
    }

    async clickConfirmOnModal() {
      log.debug('Clicking modal confirm');
      // make sure this data-test-subj 'confirmModalTitleText' exists because we're going to wait for it to be gone later
      await testSubjects.exists('confirmModalTitleText');
      await testSubjects.click('confirmModalConfirmButton');
      await this.ensureModalOverlayHidden();
    }

    async pressEnterKey() {
      await browser.pressKeys(browser.keys.ENTER);
    }

    // pass in true if your test will show multiple modals
    // in succession
    async clickCancelOnModal(overlayWillStay = false) {
      log.debug('Clicking modal cancel');
      await testSubjects.click('confirmModalCancelButton');
      if (!overlayWillStay) {
        await this.ensureModalOverlayHidden();
      }
    }

    async expectConfirmModalOpenState(state) {
      if (typeof state !== 'boolean') {
        throw new Error('pass true or false to expectConfirmModalOpenState()');
      }

      log.debug(`expectConfirmModalOpenState(${state})`);

      // we use retry here instead of a simple .exists() check because the modal
      // fades in/out, which takes time, and we really only care that at some point
      // the modal is either open or closed
      await retry.try(async () => {
        const actualState = await testSubjects.exists('confirmModalCancelButton');
        expect(actualState).to.be(state);
      });
    }

    async isChromeVisible() {
      const globalNavShown = await globalNav.exists();
      const topNavShown = await testSubjects.exists('top-nav');
      return globalNavShown && topNavShown;
    }

    async isChromeHidden() {
      const globalNavShown = await globalNav.exists();
      const topNavShown = await testSubjects.exists('top-nav');
      return !globalNavShown && !topNavShown;
    }

    async waitForTopNavToBeVisible() {
      await retry.try(async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        if (!isNavVisible) {
          throw new Error('Local nav not visible yet');
        }
      });
    }

    async closeToast() {
      let toast;
      await retry.try(async () => {
        toast = await find.byCssSelector('.euiToast');
        if (!toast) {
          throw new Error('Toast is not visible yet');
        }
      });
      await toast.moveMouseTo();
      const title = await (await find.byCssSelector('.euiToastHeader__title')).getVisibleText();
      log.debug(title);
      await find.clickByCssSelector('.euiToast__closeButton');
      return title;
    }

    async clearAllToasts() {
      const toasts = await find.allByCssSelector('.euiToast');
      for (const toastElement of toasts) {
        try {
          await toastElement.moveMouseTo();
          const closeBtn = await toastElement.findByCssSelector('.euiToast__closeButton');
          await closeBtn.click();
        } catch (err) {
          // ignore errors, toast clear themselves after timeout
        }
      }
    }

    async getBodyText() {
      if (await find.existsByCssSelector('a[id=rawdata-tab]', 10000)) {
        // Firefox has 3 tabs and requires navigation to see Raw output
        await find.clickByCssSelector('a[id=rawdata-tab]');
      }
      const msgElements = await find.allByCssSelector('body pre');
      if (msgElements.length > 0) {
        return await msgElements[0].getVisibleText();
      } else {
        // Sometimes Firefox renders Timelion page without tabs and with div#json
        const jsonElement = await find.byCssSelector('body div#json');
        return await jsonElement.getVisibleText();
      }
    }

    /**
     * Helper to detect an OSS licensed Kibana
     * Useful for functional testing in cloud environment
     */
    async isOss() {
      const baseUrl = this.getEsHostPort();
      const username = config.get('servers.elasticsearch.username');
      const password = config.get('servers.elasticsearch.password');
      const response = await fetch(baseUrl + '/_xpack', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
        },
      });
      return response.status !== 200;
    }
  }

  return new CommonPage();
}
