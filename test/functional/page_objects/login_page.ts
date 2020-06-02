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

import { FtrProviderContext } from '../ftr_provider_context';

export function LoginPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const config = getService('config');

  interface LoginOptions {
    expectSpaceSelector?: boolean;
    expectSuccess?: boolean;
    expectForbidden?: boolean;
  }

  type LoginExpectedResult = 'spaceSelector' | 'error' | 'chrome';

  class LoginPage {
    // async login(user: string, pwd: string) {
    //   await testSubjects.setValue('loginUsername', user);
    //   await testSubjects.setValue('loginPassword', pwd);
    //   await testSubjects.click('loginSubmit');
    // }

    async waitForLoginPage() {
      log.debug('Waiting for Login Page to appear.');
      await retry.waitForWithTimeout('login page', config.get('timeouts.waitFor') * 5, async () => {
        // As a part of the cleanup flow tests usually try to log users out, but there are cases when
        // browser/Kibana would like users to confirm that they want to navigate away from the current
        // page and lose the state (e.g. unsaved changes) via native alert dialog.
        const alert = await browser.getAlert();
        if (alert && alert.accept) {
          await alert.accept();
        }
        return await find.existsByDisplayedByCssSelector('.login-form');
      });
    }

    public async waitForLoginForm() {
      log.debug('Waiting for Login Form to appear.');
      await retry.waitForWithTimeout('login form', config.get('timeouts.waitFor') * 5, async () => {
        return await testSubjects.exists('loginForm');
      });
    }

    async waitForLoginSelector() {
      log.debug('Waiting for Login Selector to appear.');
      await retry.waitForWithTimeout(
        'login selector',
        config.get('timeouts.waitFor') * 5,
        async () => {
          return await testSubjects.exists('loginSelector');
        }
      );
    }

    async waitForLoginHelp(helpText: string) {
      log.debug(`Waiting for Login Help to appear with text: ${helpText}.`);
      await retry.waitForWithTimeout('login help', config.get('timeouts.waitFor') * 5, async () => {
        return (await testSubjects.getVisibleText('loginHelp')) === helpText;
      });
    }

    async waitForLoginResult(expectedResult?: LoginExpectedResult) {
      log.debug(`Waiting for login result, expected: ${expectedResult}.`);

      // wait for either space selector, kibanaChrome or loginErrorMessage
      if (expectedResult === 'spaceSelector') {
        await retry.try(() => testSubjects.find('kibanaSpaceSelector'));
        log.debug(
          `Finished login process, landed on space selector. currentUrl = ${await browser.getCurrentUrl()}`
        );
        return;
      }

      if (expectedResult === 'error') {
        const rawDataTabLocator = 'a[id=rawdata-tab]';
        if (await find.existsByCssSelector(rawDataTabLocator)) {
          // Firefox has 3 tabs and requires navigation to see Raw output
          await find.clickByCssSelector(rawDataTabLocator);
        }
        await retry.try(async () => {
          if (await find.existsByCssSelector(rawDataTabLocator)) {
            await find.clickByCssSelector(rawDataTabLocator);
          }
          await PageObjects.error.expectForbidden();
        });
        log.debug(
          `Finished login process, found forbidden message. currentUrl = ${await browser.getCurrentUrl()}`
        );
        return;
      }

      if (expectedResult === 'chrome') {
        await find.byCssSelector(
          '[data-test-subj="kibanaChrome"] .app-wrapper:not(.hidden-chrome)',
          20000
        );
        log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);
      }
    }

    // loginPageObject = Object.freeze({
    async login(username?: string, password?: string, options: LoginOptions = {}) {
      // await PageObjects.common.navigateToApp('login');

      // await this.loginPage.login(username, password, options);

      // if (options.expectSpaceSelector || options.expectForbidden) {
      //   return;
      // }

      // ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud
      // await browser.setLocalStorageItem('home:welcome:show', 'false');
      await this.waitForLoginForm();

      const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');
      await testSubjects.setValue('loginUsername', username || superUsername);
      await testSubjects.setValue('loginPassword', password || superPassword);
      await testSubjects.click('loginSubmit');

      await this.waitForLoginResult(
        options.expectSpaceSelector
          ? 'spaceSelector'
          : options.expectForbidden
          ? 'error'
          : options.expectSuccess
          ? 'chrome'
          : undefined
      );
      await retry.waitFor('logout button visible', async () => await userMenu.logoutLinkExists());
    }

    async getErrorMessage() {
      return await retry.try(async () => {
        const errorMessageContainer = await retry.try(() => testSubjects.find('loginErrorMessage'));
        const errorMessageText = await errorMessageContainer.getVisibleText();

        if (!errorMessageText) {
          throw new Error('Login Error Message not present yet');
        }

        return errorMessageText;
      });
    }
    // });

    // loginSelector = Object.freeze({
    //   async login(providerType: string, providerName: string, options?: Record<string, any>) {
    //     log.debug(`Starting login flow for ${providerType}/${providerName}`);

    //     await this.verifyLoginSelectorIsVisible();
    //     await this.selectLoginMethod(providerType, providerName);

    //     if (providerType === 'basic' || providerType === 'token') {
    //       await waitForLoginForm();

    //       const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');
    //       await testSubjects.setValue('loginUsername', options?.username ?? superUsername);
    //       await testSubjects.setValue('loginPassword', options?.password ?? superPassword);
    //       await testSubjects.click('loginSubmit');
    //     }

    //     await waitForLoginResult('chrome');

    //     log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);
    //   },

    //   async selectLoginMethod(providerType: string, providerName: string) {
    //     // Ensure welcome screen won't be shown. This is relevant for environments which don't allow
    //     // to use the yml setting, e.g. cloud.
    //     await browser.setLocalStorageItem('home:welcome:show', 'false');
    //     await testSubjects.click(`loginCard-${providerType}/${providerName}`);
    //   },

    //   async verifyLoginFormIsVisible() {
    //     await waitForLoginForm();
    //   },

    //   async verifyLoginSelectorIsVisible() {
    //     await waitForLoginSelector();
    //   },

    //   async verifyLoginHelpIsVisible(helpText: string) {
    //     await waitForLoginHelp(helpText);
    //   },
    // });
  }

  return new LoginPage();
}
