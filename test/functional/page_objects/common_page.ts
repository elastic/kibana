/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import expect from '@kbn/expect';
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
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly loginPage = this.ctx.getPageObject('login');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  private readonly defaultTryTimeout = this.config.get('timeouts.try');
  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  private getUrlWithoutPort(urlStr: string) {
    const url = new URL(urlStr);
    url.port = '';
    return url.toString();
  }

  private async disableTours() {
    const NEW_FEATURES_TOUR_STORAGE_KEYS = {
      RULE_MANAGEMENT_PAGE: 'securitySolution.rulesManagementPage.newFeaturesTour.v8.9',
      TIMELINE: 'securitySolution.timeline.newFeaturesTour.v8.12',
    };

    const tourStorageKeys = Object.values(NEW_FEATURES_TOUR_STORAGE_KEYS);
    const tourConfig = {
      isTourActive: false,
    };

    for (const key of tourStorageKeys) {
      await this.browser.setLocalStorageItem(key, JSON.stringify(tourConfig));
    }
  }

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

    await this.disableTours();

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

      if (
        currentUrl.includes('/app/home') &&
        disableWelcomePrompt &&
        (await this.isWelcomeScreen())
      ) {
        await this.browser.setLocalStorageItem('home:welcome:show', 'false');
        // Force a new navigation again
        const msg = `Found the Welcome page in ${currentUrl}. Skipping it...`;
        this.log.debug(msg);
        throw new Error(msg);
      }

      if (ensureCurrentUrl) {
        const actualUrl = this.getUrlWithoutPort(currentUrl);
        const expectedUrl = this.getUrlWithoutPort(appUrl);

        if (!actualUrl.includes(expectedUrl)) {
          throw new Error(`expected ${actualUrl}.includes(${expectedUrl})`);
        }
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

    if (typeof subUrl === 'string') {
      if (shouldUseHashForSubUrl) {
        appConfig.hash = useActualUrl ? subUrl : `/${appName}/${subUrl}`;
      } else {
        appConfig.pathname += `/${subUrl}`;
      }
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
      pathname: `${basePath}${this.config.get(['apps', appName]).pathname}${subUrl || ''}`,
      search: search || '',
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
      path = '',
      hash = '',
      search = '',
      disableWelcomePrompt = true,
      insertTimestamp = true,
      retryOnFatalError = true,
    } = {}
  ) {
    let appUrl: string;

    // See https://github.com/elastic/kibana/pull/164376
    if (appName === 'canvas' && !path) {
      throw new Error(
        'This causes flaky test failures. Use Canvas page object goToListingPage instead'
      );
    }

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
        pathname: `${basePath}/app/${appName}` + (path ? `/${path}` : ''),
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

        // If navigating to the `home` app, and we want to skip the Welcome page, but the chrome is still hidden,
        // set the relevant localStorage key to skip the Welcome page and throw an error to try to navigate again.
        if (
          appName === 'home' &&
          currentUrl.includes('app/home') &&
          disableWelcomePrompt &&
          (await this.isWelcomeScreen())
        ) {
          await this.browser.setLocalStorageItem('home:welcome:show', 'false');
          const msg = `Failed to skip the Welcome page when navigating the app ${appName}`;
          this.log.debug(msg);
          throw new Error(msg);
        }

        currentUrl = (await this.browser.getCurrentUrl()).replace(/\/\/\w+:\w+@/, '//');
        const decodedAppUrl = decodeURIComponent(appUrl);
        const decodedCurrentUrl = decodeURIComponent(currentUrl);

        const navSuccessful = decodedCurrentUrl
          .replace(':80/', '/')
          .replace(':443/', '/')
          .startsWith(decodedAppUrl.replace(':80/', '/').replace(':443/', '/'));

        if (!navSuccessful) {
          const msg = `App failed to load: ${appName} in ${this.defaultFindTimeout}ms appUrl=${decodedAppUrl} currentUrl=${decodedCurrentUrl}`;
          this.log.debug(msg);
          throw new Error(msg);
        }

        if (retryOnFatalError && (await this.isFatalErrorScreen())) {
          const msg = `Fatal error screen shown. Let's try refreshing the page once more.`;
          this.log.debug(msg);
          throw new Error(msg);
        }

        if (appName === 'discover') {
          await this.browser.setLocalStorageItem('data.autocompleteFtuePopover', 'true');
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
      const shown = await this.testSubjects.exists('confirmModalTitleText', { timeout: 500 });
      if (shown) {
        throw new Error('Modal overlay is showing');
      }
    });
  }

  async clickConfirmOnModal(ensureHidden = true) {
    this.log.debug('Clicking modal confirm');
    // make sure this data-test-subj 'confirmModalTitleText' exists because we're going to wait for it to be gone later
    await this.testSubjects.exists('confirmModalTitleText');
    // make sure button is enabled before clicking it
    // (and conveniently give UI enough time to bind a handler to it)
    const isEnabled = await this.testSubjects.isEnabled('confirmModalConfirmButton');
    if (!isEnabled) {
      throw new Error('Modal confirm button is not enabled');
    }
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
    return await this.testSubjects.exists('kbnAppWrapper visibleChrome');
  }

  async isChromeHidden() {
    return await this.testSubjects.exists('kbnAppWrapper hiddenChrome');
  }

  async isFatalErrorScreen() {
    return await this.testSubjects.exists('fatalErrorScreen');
  }

  async waitForTopNavToBeVisible() {
    await this.retry.try(async () => {
      const isNavVisible = await this.testSubjects.exists('top-nav');
      if (!isNavVisible) {
        throw new Error('Local nav not visible yet');
      }
    });
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
      if (await this.testSubjects.exists('savedObjectSaveModal', { timeout: 5000 })) {
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

  async isWelcomeScreen() {
    return await this.testSubjects.exists('homeWelcomeInterstitial');
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
    await this.kibanaServer.uiSettings.update({
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
