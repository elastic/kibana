/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import expect from '@kbn/expect';
// @ts-ignore
import fetch from 'node-fetch';
import { getUrl } from '@kbn/test';
import moment from 'moment';
import { FtrService } from '../ftr_provider_context';

interface NavigateProps {
  appConfig: {};
  ensureCurrentUrl: boolean;
  shouldLoginIfPrompted: boolean;
  useActualUrl: boolean;
  insertTimestamp: boolean;
  disableWelcomePrompt: boolean;
}
export class CommonPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly config = this.ctx.getService('config');
  private readonly browser = this.ctx.getService('browser');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly loginPage = this.ctx.getPageObject('login');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  private readonly defaultTryTimeout = this.config.get('timeouts.try');
  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  /**
   * Logins to Kibana as default user and navigates to provided app
   * @param appUrl Kibana URL
   */
  private async loginIfPrompted(
    appUrl: string,
    insertTimestamp: boolean,
    disableWelcomePrompt: boolean
  ) {
    // Disable the welcome screen. This is relevant for environments
    // which don't allow to use the yml setting, e.g. cloud production.
    // It is done here so it applies to logins but also to a login re-use.
    if (disableWelcomePrompt) {
      await this.browser.setLocalStorageItem('home:welcome:show', 'false');
    }

    let currentUrl = await this.browser.getCurrentUrl();
    this.log.debug(`currentUrl = ${currentUrl}\n    appUrl = ${appUrl}`);
    await this.testSubjects.find('kibanaChrome', 6 * this.defaultFindTimeout); // 60 sec waiting
    const loginPage = currentUrl.includes('/login');
    const wantedLoginPage = appUrl.includes('/login') || appUrl.includes('/logout');

    if (loginPage && !wantedLoginPage) {
      this.log.debug('Found login page');
      if (this.config.get('security.disableTestUser')) {
        await this.loginPage.login(
          this.config.get('servers.kibana.username'),
          this.config.get('servers.kibana.password')
        );
      } else {
        await this.loginPage.login('test_user', 'changeme');
      }

      if (appUrl.includes('/status')) {
        await this.testSubjects.find('statusPageRoot');
      } else {
        await this.find.byCssSelector(
          '[data-test-subj="kibanaChrome"] nav:not(.ng-hide)',
          6 * this.defaultFindTimeout
        );
      }
      await this.browser.get(appUrl, insertTimestamp);
      currentUrl = await this.browser.getCurrentUrl();
      this.log.debug(`Finished login process currentUrl = ${currentUrl}`);
    }
    return currentUrl;
  }

  private async navigate(navigateProps: NavigateProps) {
    const {
      appConfig,
      ensureCurrentUrl,
      shouldLoginIfPrompted,
      disableWelcomePrompt,
      useActualUrl,
      insertTimestamp,
    } = navigateProps;
    const appUrl = getUrl.noAuth(this.config.get('servers.kibana'), appConfig);

    await this.retry.try(async () => {
      if (useActualUrl) {
        this.log.debug(`navigateToActualUrl ${appUrl}`);
        await this.browser.get(appUrl);
      } else {
        this.log.debug(`navigateToUrl ${appUrl}`);
        await this.browser.get(appUrl, insertTimestamp);
      }

      // accept alert if it pops up
      const alert = await this.browser.getAlert();
      await alert?.accept();

      const currentUrl = shouldLoginIfPrompted
        ? await this.loginIfPrompted(appUrl, insertTimestamp, disableWelcomePrompt)
        : await this.browser.getCurrentUrl();

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
      disableWelcomePrompt = true,
      useActualUrl = false,
      insertTimestamp = true,
      shouldUseHashForSubUrl = true,
    } = {}
  ) {
    const appConfig: { pathname: string; hash?: string } = {
      pathname: `${basePath}${this.config.get(['apps', appName]).pathname}`,
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
      disableWelcomePrompt,
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
      disableWelcomePrompt = true,
      useActualUrl = true,
      insertTimestamp = true,
    } = {}
  ) {
    const appConfig = {
      // subUrl following the basePath, assumes no hashes.  Ex: 'app/endpoint/management'
      pathname: `${basePath}${this.config.get(['apps', appName]).pathname}${subUrl}`,
      search,
    };

    await this.navigate({
      appConfig,
      ensureCurrentUrl,
      shouldLoginIfPrompted,
      disableWelcomePrompt,
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
    this.log.debug(`... sleep(${sleepMilliseconds}) start`);
    await setTimeoutAsync(sleepMilliseconds);
    this.log.debug(`... sleep(${sleepMilliseconds}) end`);
  }

  async navigateToApp(
    appName: string,
    {
      basePath = '',
      shouldLoginIfPrompted = true,
      hash = '',
      search = '',
      disableWelcomePrompt = true,
      insertTimestamp = true,
    } = {}
  ) {
    let appUrl: string;
    if (this.config.has(['apps', appName])) {
      // Legacy applications
      const appConfig = this.config.get(['apps', appName]);
      appUrl = getUrl.noAuth(this.config.get('servers.kibana'), {
        pathname: `${basePath}${appConfig.pathname}`,
        hash: hash || appConfig.hash,
        search,
      });
    } else {
      appUrl = getUrl.noAuth(this.config.get('servers.kibana'), {
        pathname: `${basePath}/app/${appName}`,
        hash,
        search,
      });
    }

    this.log.debug('navigating to ' + appName + ' url: ' + appUrl);

    await this.retry.tryForTime(this.defaultTryTimeout * 2, async () => {
      let lastUrl = await this.retry.try(async () => {
        // since we're using hash URLs, always reload first to force re-render
        this.log.debug('navigate to: ' + appUrl);
        await this.browser.get(appUrl, insertTimestamp);
        // accept alert if it pops up
        const alert = await this.browser.getAlert();
        await alert?.accept();
        await this.sleep(700);
        this.log.debug('returned from get, calling refresh');
        await this.browser.refresh();
        let currentUrl = shouldLoginIfPrompted
          ? await this.loginIfPrompted(appUrl, insertTimestamp, disableWelcomePrompt)
          : await this.browser.getCurrentUrl();

        if (currentUrl.includes('app/kibana')) {
          await this.testSubjects.find('kibanaChrome');
        }

        currentUrl = (await this.browser.getCurrentUrl()).replace(/\/\/\w+:\w+@/, '//');

        const navSuccessful = currentUrl
          .replace(':80/', '/')
          .replace(':443/', '/')
          .startsWith(appUrl);

        if (!navSuccessful) {
          const msg = `App failed to load: ${appName} in ${this.defaultFindTimeout}ms appUrl=${appUrl} currentUrl=${currentUrl}`;
          this.log.debug(msg);
          throw new Error(msg);
        }
        if (appName === 'discover') {
          await this.browser.setLocalStorageItem('data.autocompleteFtuePopover', 'true');
          await this.browser.setLocalStorageItem('data.newDataViewMenu', 'true');
        }
        return currentUrl;
      });

      await this.retry.tryForTime(this.defaultFindTimeout, async () => {
        await this.sleep(501);
        const currentUrl = await this.browser.getCurrentUrl();
        this.log.debug('in navigateTo url = ' + currentUrl);
        if (lastUrl !== currentUrl) {
          lastUrl = currentUrl;
          throw new Error('URL changed, waiting for it to settle');
        }
      });
    });
  }

  async waitUntilUrlIncludes(path: string) {
    await this.retry.try(async () => {
      const url = await this.browser.getCurrentUrl();
      if (!url.includes(path)) {
        throw new Error('Url not found');
      }
    });
  }

  async getSharedItemTitleAndDescription() {
    const cssSelector = '[data-shared-item][data-title][data-description]';
    const element = await this.find.byCssSelector(cssSelector);

    return {
      title: await element.getAttribute('data-title'),
      description: await element.getAttribute('data-description'),
    };
  }

  async getSharedItemContainers() {
    const cssSelector = '[data-shared-items-container]';
    return this.find.allByCssSelector(cssSelector);
  }

  async ensureModalOverlayHidden() {
    return this.retry.try(async () => {
      const shown = await this.testSubjects.exists('confirmModalTitleText');
      if (shown) {
        throw new Error('Modal overlay is showing');
      }
    });
  }

  async clickConfirmOnModal(ensureHidden = true) {
    this.log.debug('Clicking modal confirm');
    // make sure this data-test-subj 'confirmModalTitleText' exists because we're going to wait for it to be gone later
    await this.testSubjects.exists('confirmModalTitleText');
    await this.testSubjects.click('confirmModalConfirmButton');
    if (ensureHidden) {
      await this.ensureModalOverlayHidden();
    }
  }

  async pressEnterKey() {
    await this.browser.pressKeys(this.browser.keys.ENTER);
  }

  async pressTabKey() {
    await this.browser.pressKeys(this.browser.keys.TAB);
  }

  // Pause the browser at a certain place for debugging
  // Not meant for usage in CI, only for dev-usage
  async pause() {
    return this.browser.pause();
  }

  /**
   * Clicks cancel button on modal
   * @param overlayWillStay pass in true if your test will show multiple modals in succession
   */
  async clickCancelOnModal(overlayWillStay = true) {
    this.log.debug('Clicking modal cancel');
    await this.testSubjects.click('confirmModalCancelButton');
    if (!overlayWillStay) {
      await this.ensureModalOverlayHidden();
    }
  }

  async expectConfirmModalOpenState(state: boolean) {
    this.log.debug(`expectConfirmModalOpenState(${state})`);
    // we use retry here instead of a simple .exists() check because the modal
    // fades in/out, which takes time, and we really only care that at some point
    // the modal is either open or closed
    await this.retry.try(async () => {
      const actualState = await this.testSubjects.exists('confirmModalCancelButton');
      expect(actualState).to.equal(
        state,
        state ? 'Confirm modal should be present' : 'Confirm modal should be hidden'
      );
    });
  }

  async isChromeVisible() {
    const globalNavShown = await this.globalNav.exists();
    return globalNavShown;
  }

  async isChromeHidden() {
    const globalNavShown = await this.globalNav.exists();
    return !globalNavShown;
  }

  async waitForTopNavToBeVisible() {
    await this.retry.try(async () => {
      const isNavVisible = await this.testSubjects.exists('top-nav');
      if (!isNavVisible) {
        throw new Error('Local nav not visible yet');
      }
    });
  }

  async closeToast() {
    const toast = await this.find.byCssSelector('.euiToast', 6 * this.defaultFindTimeout);
    await toast.moveMouseTo();
    const title = await (await this.find.byCssSelector('.euiToastHeader__title')).getVisibleText();

    await this.find.clickByCssSelector('.euiToast__closeButton');
    return title;
  }

  async closeToastIfExists() {
    const toastShown = await this.find.existsByCssSelector('.euiToast');
    if (toastShown) {
      try {
        await this.find.clickByCssSelector('.euiToast__closeButton');
      } catch (err) {
        // ignore errors, toast clear themselves after timeout
      }
    }
  }

  async clearAllToasts() {
    const toasts = await this.find.allByCssSelector('.euiToast');
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

  async getJsonBodyText() {
    if (await this.find.existsByCssSelector('a[id=rawdata-tab]', this.defaultFindTimeout)) {
      // Firefox has 3 tabs and requires navigation to see Raw output
      await this.find.clickByCssSelector('a[id=rawdata-tab]');
    }
    const msgElements = await this.find.allByCssSelector('body pre');
    if (msgElements.length > 0) {
      return await msgElements[0].getVisibleText();
    } else {
      // Sometimes Firefox renders Timelion page without tabs and with div#json
      const jsonElement = await this.find.byCssSelector('body div#json');
      return await jsonElement.getVisibleText();
    }
  }

  async getBodyText() {
    const body = await this.find.byCssSelector('body');
    return await body.getVisibleText();
  }

  async waitForSaveModalToClose() {
    this.log.debug('Waiting for save modal to close');
    await this.retry.try(async () => {
      if (await this.testSubjects.exists('savedObjectSaveModal')) {
        throw new Error('save modal still open');
      }
    });
  }

  async setFileInputPath(path: string) {
    this.log.debug(`Setting the path '${path}' on the file input`);
    const input = await this.find.byCssSelector('.euiFilePicker__input');
    await input.type(path);
  }

  async scrollKibanaBodyTop() {
    await this.browser.setScrollToById('kibana-body', 0, 0);
  }

  /**
   * Dismiss Banner if available.
   */
  async dismissBanner() {
    if (await this.testSubjects.exists('global-banner-item')) {
      const button = await this.find.byButtonText('Dismiss');
      await button.click();
    }
  }

  /**
   * Get visible text of the Welcome Banner
   */
  async getWelcomeText() {
    return await this.testSubjects.getVisibleText('global-banner-item');
  }

  /**
   * Clicks on an element, and validates that the desired effect has taken place
   * by confirming the existence of a validator
   */
  async clickAndValidate(
    clickTarget: string,
    validator: string,
    isValidatorCssString: boolean = false,
    topOffset?: number
  ) {
    await this.testSubjects.click(clickTarget, undefined, topOffset);
    if (isValidatorCssString) {
      await this.find.byCssSelector(validator);
    } else {
      await this.testSubjects.exists(validator);
    }
  }

  /**
   * Due to a warning thrown, documented at:
   * https://github.com/elastic/kibana/pull/114997#issuecomment-950823874
   * this fn formats time in a format specified, or defaulted
   * to the same format in
   * [getTimeDurationInHours()](https://github.com/elastic/kibana/blob/main/test/functional/page_objects/time_picker.ts#L256)
   * @param time
   * @param fmt
   */
  formatTime(time: TimeStrings, fmt: string = 'MMM D, YYYY @ HH:mm:ss.SSS') {
    return Object.keys(time)
      .map((x) => moment.utc(time[x], [fmt]).format())
      .reduce(
        (acc, curr, idx) => {
          if (idx === 0) acc.from = curr;
          acc.to = curr;
          return acc;
        },
        { from: '', to: '' }
      );
  }

  /**
   * Previously, many tests were using the time picker.
   * To speed things up, we are now setting time here.
   * The formatting fn is called here, such that the tests
   * that were using the time picker can use the same time
   * parameters as before, but they are auto-formatted.
   * @param time
   */
  async setTime(time: TimeStrings) {
    await this.kibanaServer.uiSettings.replace({
      'timepicker:timeDefaults': JSON.stringify(this.formatTime(time)),
    });
  }

  async unsetTime() {
    await this.kibanaServer.uiSettings.unset('timepicker:timeDefaults');
  }
}
export interface TimeStrings extends Record<string, any> {
  from: string;
  to: string;
}
