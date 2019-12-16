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

import Url from 'url';
import { SecurityService as CommonSecurityService } from '../../common/services/security';
import { FtrProviderContext } from '../ftr_provider_context';

export function SecurityProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const config = getService('config');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'error']);
  const kibanaUrl = Url.format(config.get('servers.kibana'));

  interface LoginAsOptions {
    username: string;
    password: string;
    expect?: null | 'spaceSelector' | 'success' | 'forbidden';
  }

  class SecurityService extends CommonSecurityService {
    async loginAsSuperUser(options: { expect?: LoginAsOptions['expect'] } = {}) {
      return await this.loginAs({
        username: config.get('servers.elasticsearch.username'),
        password: config.get('servers.elasticsearch.password'),
        ...options,
      });
    }

    async loginAs({ username, password, expect = 'success' }: LoginAsOptions) {
      const rawDataTabLocator = 'a[id=rawdata-tab]';

      await PageObjects.common.navigateToApp('login');
      await testSubjects.setValue('loginUsername', username);
      await testSubjects.setValue('loginPassword', password);
      await testSubjects.click('loginSubmit');

      // wait for either space selector, kibanaChrome or loginErrorMessage
      switch (expect) {
        case 'spaceSelector':
          await retry.try(() => testSubjects.find('kibanaSpaceSelector'));
          log.debug(
            `Finished login process, landed on space selector. currentUrl = ${await browser.getCurrentUrl()}`
          );
          break;

        case 'forbidden':
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
          break;

        case 'success':
          await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
          log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);

          await retry.waitFor(
            'user menu visible',
            async () => await testSubjects.exists('userMenu')
          );
          break;
      }
    }

    async logout() {
      log.debug('SecurityPage.forceLogout');
      if (await find.existsByDisplayedByCssSelector('.login-form', 100)) {
        log.debug('Already on the login page, not forcing anything');
        return;
      }

      log.debug('Redirecting to /logout to force the logout');
      const url = PageObjects.common.getHostPort() + '/logout';
      await browser.get(url);
      log.debug('Waiting on the login form to appear');
      await retry.waitForWithTimeout(
        'login form',
        config.get('timeouts.waitFor') * 5,
        async () => await find.existsByDisplayedByCssSelector('.login-form')
      );
    }
  }

  return new SecurityService(kibanaUrl, log);
}
