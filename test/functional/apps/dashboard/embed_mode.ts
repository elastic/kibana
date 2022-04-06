/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
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
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
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
      await kibanaServer.savedObjects.cleanStandardList();
    });
  });
}
