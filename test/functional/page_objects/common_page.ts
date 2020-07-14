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
import { get } from 'lodash';
// @ts-ignore
import fetch from 'node-fetch';
import { FtrProviderContext } from '../ftr_provider_context';
// @ts-ignore not TS yet
import getUrl from '../../../src/test_utils/get_url';

export function CommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const browser = getService('browser');
  const retry = getService('retry');
  const find = getService('find');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['login']);

  const defaultTryTimeout = config.get('timeouts.try');
  const defaultFindTimeout = config.get('timeouts.find');

  interface NavigateProps {
    appConfig: {};
    ensureCurrentUrl: boolean;
    shouldLoginIfPrompted: boolean;
    useActualUrl: boolean;
    insertTimestamp: boolean;
  }

  class CommonPage {
    /**
     * Returns Kibana host URL
     */
    public getHostPort() {
      return getUrl.baseUrl(config.get('servers.kibana'));
    }

    /**
     * Returns ES host URL
     */
    public getEsHostPort() {
      return getUrl.baseUrl(config.get('servers.elasticsearch'));
    }

    /**
     * Logins to Kibana as default user and navigates to provided app
     * @param appUrl Kibana URL
     */
    private async loginIfPrompted(appUrl: string, insertTimestamp: boolean) {
      // Disable the welcome screen. This is relevant for environments
      // which don't allow to use the yml setting, e.g. cloud production.
      // It is done here so it applies to logins but also to a login re-use.
      await browser.setLocalStorageItem('home:welcome:show', 'false');

      let currentUrl = await browser.getCurrentUrl();
      log.debug(`currentUrl = ${currentUrl}\n    appUrl = ${appUrl}`);
      await testSubjects.find('kibanaChrome', 6 * defaultFindTimeout); // 60 sec waiting
      const loginPage = currentUrl.includes('/login');
      const wantedLoginPage = appUrl.includes('/login') || appUrl.includes('/logout');

      if (loginPage && !wantedLoginPage) {
        log.debug('Found login page');
        if (config.get('security.disableTestUser')) {
          await PageObjects.login.login(
            config.get('servers.kibana.username'),
            config.get('servers.kibana.password')
          );
        } else {
          await PageObjects.login.login('test_user', 'changeme');
        }

        await find.byCssSelector(
          '[data-test-subj="kibanaChrome"] nav:not(.ng-hide)',
          6 * defaultFindTimeout
        );
        await browser.get(appUrl, insertTimestamp);
        currentUrl = await browser.getCurrentUrl();
        log.debug(`Finished login process currentUrl = ${currentUrl}`);
      }
      return currentUrl;
    }

    private async navigate(navigateProps: NavigateProps) {
      const {
        appConfig,
        ensureCurrentUrl,
        shouldLoginIfPrompted,
        useActualUrl,
        insertTimestamp,
      } = navigateProps;
      const appUrl = getUrl.noAuth(config.get('servers.kibana'), appConfig);

      await retry.try(async () => {
        if (useActualUrl) {
          log.debug(`navigateToActualUrl ${appUrl}`);
          await browser.get(appUrl);
        } else {
          log.debug(`navigateToUrl ${appUrl}`);
          await browser.get(appUrl, insertTimestamp);
          // accept alert if it pops up
          const alert = await browser.getAlert();
          await alert?.accept();
        }

        const currentUrl = shouldLoginIfPrompted
          ? await this.loginIfPrompted(appUrl, insertTimestamp)
          : await browser.getCurrentUrl();

        if (ensureCurrentUrl && !currentUrl.includes(appUrl)) {
          throw new Error(`expected ${currentUrl}.includes(${appUrl})`);
        }
      });
    }

    /**
     * Navigates browser using the pathname from the appConfig and subUrl as the hash
     * @param appName As defined in the apps config, e.g. 'home'
     * @param subUrl The route after the hash (#), e.g. '/tutorial_directory/sampleData'
     * @param args additional arguments
     */
    public async navigateToUrl(
      appName: string,
      subUrl?: string,
      {
        basePath = '',
        ensureCurrentUrl = true,
        shouldLoginIfPrompted = true,
        useActualUrl = false,
        insertTimestamp = true,
        shouldUseHashForSubUrl = true,
      } = {}
    ) {
      const appConfig: { pathname: string; hash?: string } = {
        pathname: `${basePath}${config.get(['apps', appName]).pathname}`,
      };

      if (shouldUseHashForSubUrl) {
        appConfig.hash = useActualUrl ? subUrl : `/${appName}/${subUrl}`;
      } else {
        appConfig.pathname += `/${subUrl}`;
      }

      await this.navigate({
        appConfig,
        ensureCurrentUrl,
        shouldLoginIfPrompted,
        useActualUrl,
        insertTimestamp,
      });
    }

    /**
     * Navigates browser using the pathname from the appConfig and subUrl as the extended path.
     * This was added to be able to test an application that uses browser history over hash history.
     * @param appName As defined in the apps config, e.g. 'home'
     * @param subUrl The route after the appUrl, e.g. '/tutorial_directory/sampleData'
     * @param args additional arguments
     */
    public async navigateToUrlWithBrowserHistory(
      appName: string,
      subUrl?: string,
      search?: string,
      {
        basePath = '',
        ensureCurrentUrl = true,
        shouldLoginIfPrompted = true,
        useActualUrl = true,
        insertTimestamp = true,
      } = {}
    ) {
      const appConfig = {
        // subUrl following the basePath, assumes no hashes.  Ex: 'app/endpoint/management'
        pathname: `${basePath}${config.get(['apps', appName]).pathname}${subUrl}`,
        search,
      };

      await this.navigate({
        appConfig,
        ensureCurrentUrl,
        shouldLoginIfPrompted,
        useActualUrl,
        insertTimestamp,
      });
    }

    /**
     * Navigates browser using only the pathname from the appConfig
     * @param appName As defined in the apps config, e.g. 'kibana'
     * @param hash The route after the hash (#), e.g. 'management/kibana/settings'
     * @param args additional arguments
     */
    async navigateToActualUrl(
      appName: string,
      hash?: string,
      { basePath = '', ensureCurrentUrl = true, shouldLoginIfPrompted = true } = {}
    ) {
      await this.navigateToUrl(appName, hash, {
        basePath,
        ensureCurrentUrl,
        shouldLoginIfPrompted,
        useActualUrl: true,
      });
    }

    async sleep(sleepMilliseconds: number) {
      log.debug(`... sleep(${sleepMilliseconds}) start`);
      await delay(sleepMilliseconds);
      log.debug(`... sleep(${sleepMilliseconds}) end`);
    }

    async navigateToApp(
      appName: string,
      { basePath = '', shouldLoginIfPrompted = true, hash = '', insertTimestamp = true } = {}
    ) {
      let appUrl: string;
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
          hash,
        });
      }

      log.debug('navigating to ' + appName + ' url: ' + appUrl);

      await retry.tryForTime(defaultTryTimeout * 2, async () => {
        let lastUrl = await retry.try(async () => {
          // since we're using hash URLs, always reload first to force re-render
          log.debug('navigate to: ' + appUrl);
          await browser.get(appUrl, insertTimestamp);
          // accept alert if it pops up
          const alert = await browser.getAlert();
          await alert?.accept();
          await this.sleep(700);
          log.debug('returned from get, calling refresh');
          await browser.refresh();
          let currentUrl = shouldLoginIfPrompted
            ? await this.loginIfPrompted(appUrl, insertTimestamp)
            : await browser.getCurrentUrl();

          if (currentUrl.includes('app/kibana')) {
            await testSubjects.find('kibanaChrome');
          }

          currentUrl = (await browser.getCurrentUrl()).replace(/\/\/\w+:\w+@/, '//');

          const navSuccessful = currentUrl
            .replace(':80/', '/')
            .replace(':443/', '/')
            .startsWith(appUrl);

          if (!navSuccessful) {
            const msg = `App failed to load: ${appName} in ${defaultFindTimeout}ms appUrl=${appUrl} currentUrl=${currentUrl}`;
            log.debug(msg);
            throw new Error(msg);
          }
          return currentUrl;
        });

        await retry.try(async () => {
          await this.sleep(501);
          const currentUrl = await browser.getCurrentUrl();
          log.debug('in navigateTo url = ' + currentUrl);
          if (lastUrl !== currentUrl) {
            lastUrl = currentUrl;
            throw new Error('URL changed, waiting for it to settle');
          }
        });
        if (appName === 'status_page') return;
        if (await testSubjects.exists('statusPageContainer')) {
          throw new Error('Navigation ended up at the status page.');
        }
      });
    }

    async waitUntilUrlIncludes(path: string) {
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
        description: await element.getAttribute('data-description'),
      };
    }

    async getSharedItemContainers() {
      const cssSelector = '[data-shared-items-container]';
      return find.allByCssSelector(cssSelector);
    }

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

    // Pause the browser at a certain place for debugging
    // Not meant for usage in CI, only for dev-usage
    async pause() {
      return browser.pause();
    }

    /**
     * Clicks cancel button on modal
     * @param overlayWillStay pass in true if your test will show multiple modals in succession
     */
    async clickCancelOnModal(overlayWillStay = true) {
      log.debug('Clicking modal cancel');
      await testSubjects.click('confirmModalCancelButton');
      if (!overlayWillStay) {
        await this.ensureModalOverlayHidden();
      }
    }

    async expectConfirmModalOpenState(state: boolean) {
      log.debug(`expectConfirmModalOpenState(${state})`);
      // we use retry here instead of a simple .exists() check because the modal
      // fades in/out, which takes time, and we really only care that at some point
      // the modal is either open or closed
      await retry.try(async () => {
        const actualState = await testSubjects.exists('confirmModalCancelButton');
        expect(actualState).to.equal(
          state,
          state ? 'Confirm modal should be present' : 'Confirm modal should be hidden'
        );
      });
    }

    async isChromeVisible() {
      const globalNavShown = await globalNav.exists();
      return globalNavShown;
    }

    async isChromeHidden() {
      const globalNavShown = await globalNav.exists();
      return !globalNavShown;
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
      const toast = await find.byCssSelector('.euiToast', 2 * defaultFindTimeout);
      await toast.moveMouseTo();
      const title = await (await find.byCssSelector('.euiToastHeader__title')).getVisibleText();

      await find.clickByCssSelector('.euiToast__closeButton');
      return title;
    }

    async closeToastIfExists() {
      const toastShown = await find.existsByCssSelector('.euiToast');
      if (toastShown) {
        await find.clickByCssSelector('.euiToast__closeButton');
      }
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
      if (await find.existsByCssSelector('a[id=rawdata-tab]', defaultFindTimeout)) {
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
          Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
        },
      });
      return response.status !== 200;
    }

    async isCloud(): Promise<boolean> {
      const baseUrl = this.getHostPort();
      const username = config.get('servers.kibana.username');
      const password = config.get('servers.kibana.password');
      const response = await fetch(baseUrl + '/api/stats?extended', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
        },
      });
      const data = await response.json();
      return get(data, 'usage.cloud.is_cloud_enabled', false);
    }

    async waitForSaveModalToClose() {
      log.debug('Waiting for save modal to close');
      await retry.try(async () => {
        if (await testSubjects.exists('savedObjectSaveModal')) {
          throw new Error('save modal still open');
        }
      });
    }

    async setFileInputPath(path: string) {
      log.debug(`Setting the path '${path}' on the file input`);
      const input = await find.byCssSelector('.euiFilePicker__input');
      await input.type(path);
    }
  }

  return new CommonPage();
}
