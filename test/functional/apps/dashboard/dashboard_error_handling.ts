/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  /**
   * Common test suite for testing exception scenarious within dashboard
   */
  describe('dashboard error handling', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await PageObjects.common.navigateToApp('dashboard');
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
