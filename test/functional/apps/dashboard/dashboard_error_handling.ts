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
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const browser = getService('browser');

  /**
   * Common test suite for testing exception scenarious within dashboard
   */
  describe('dashboard error handling', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      // The kbn_archiver above was created from an es_archiver which intentionally had
      // 2 missing index patterns.  But that would fail to load with kbn_archiver.
      // So we unload those 2 index patterns here.
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana_unload'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard_error_cases.json'
      );
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('correctly loads default index pattern on first load with an error embeddable', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('Dashboard with Missing Lens Panel');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await filterBar.addFilter('bytes', 'is', '12345678');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
    });

    // wrapping into own describe to make sure new tab is cleaned up even if test failed
    // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
    describe('recreate index pattern link works', () => {
      let tabsCount = 1;
      it('recreate index pattern link works', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('dashboard with missing index pattern');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const errorEmbeddable = await testSubjects.find('embeddableStackError');
        await (await errorEmbeddable.findByTagName('a')).click();
        await browser.switchTab(1);
        tabsCount++;
        await testSubjects.existOrFail('createIndexPatternButton');
      });

      after(async () => {
        if (tabsCount > 1) {
          await browser.closeCurrentWindow();
          await browser.switchTab(0);
        }
      });
    });
  });
}
