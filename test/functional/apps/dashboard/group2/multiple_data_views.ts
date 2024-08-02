/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Test the filtering behavior of a dashboard with multiple data views
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker', 'home']);

  describe('dashboard multiple data views', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': true });
      await PageObjects.common.navigateToApp('home');
      await PageObjects.home.goToSampleDataPage();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.home.addSampleDataSet('logs');
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.addSavedSearches(['[Flights] Flight Log', '[Logs] Visits']);
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.timePicker.setCommonlyUsedTime('This_week');
    });

    after(async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.home.goToSampleDataPage();
      await PageObjects.home.removeSampleDataSet('flights');
      await PageObjects.home.removeSampleDataSet('logs');
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
    });

    it('ignores filters on panels using a data view without the filter field', async () => {
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });
      const logsSavedSearchPanel = (await testSubjects.findAll('embeddedSavedSearchDocTable'))[1];
      expect(
        await (
          await logsSavedSearchPanel.findByCssSelector('[data-document-number]')
        ).getAttribute('data-document-number')
      ).to.not.be('0');
    });

    it('applies filters on panels using a data view without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
      await PageObjects.dashboard.navigateToApp();
      await testSubjects.click('edit-unsaved-New-Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();
      const logsSavedSearchPanel = (await testSubjects.findAll('embeddedSavedSearchDocTable'))[1];
      expect(
        await (
          await logsSavedSearchPanel.findByCssSelector('[data-document-number]')
        ).getAttribute('data-document-number')
      ).to.be('0');
    });
  });
}
