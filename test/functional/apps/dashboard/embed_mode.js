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

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['dashboard', 'common']);
  const browser = getService('browser');
  const globalNav = getService('globalNav');

  describe('embed mode', () => {
    const urlParamExtensions = [
      'show-top-menu=true',
      'show-query-input=true',
      'show-time-filter=true',
      'hide-filter-bar=true',
    ];

    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides the chrome', async () => {
      const globalNavShown = await globalNav.exists();
      expect(globalNavShown).to.be(true);

      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl + '&embed=true';
      // Embed parameter only works on a hard refresh.
      const useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);

      await retry.try(async () => {
        const globalNavHidden = !(await globalNav.exists());
        expect(globalNavHidden).to.be(true);
      });
    });

    it('shows or hides elements based on URL params', async () => {
      await testSubjects.missingOrFail('top-nav');
      await testSubjects.missingOrFail('queryInput');
      await testSubjects.missingOrFail('superDatePickerToggleQuickMenuButton');
      await testSubjects.existOrFail('showFilterActions');

      const currentUrl = await browser.getCurrentUrl();
      const newUrl = [currentUrl].concat(urlParamExtensions).join('&');
      // Embed parameter only works on a hard refresh.
      const useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);

      await testSubjects.existOrFail('top-nav');
      await testSubjects.existOrFail('queryInput');
      await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
      await testSubjects.missingOrFail('showFilterActions');
    });

    after(async function () {
      const currentUrl = await browser.getCurrentUrl();
      const replaceParams = ['', 'embed=true'].concat(urlParamExtensions).join('&');
      const newUrl = currentUrl.replace(replaceParams, '');
      // First use the timestamp to cause a hard refresh so the new embed parameter works correctly.
      let useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);
      // Then get rid of the timestamp so the rest of the tests work with state and app switching.
      useTimeStamp = false;
      await browser.get(newUrl.toString(), useTimeStamp);
    });
  });
}
