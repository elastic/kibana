/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const { common, dashboard, timePicker, home } = getPageObjects([
    'common',
    'dashboard',
    'timePicker',
    'home',
  ]);

  // Failing: See https://github.com/elastic/kibana/issues/191880
  describe.skip('dashboard multiple data views', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': true });
      await common.navigateToApp('home');
      await home.goToSampleDataPage();
      await home.addSampleDataSet('flights');
      await home.addSampleDataSet('logs');
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.addSavedSearches(['[Flights] Flight Log', '[Logs] Visits']);
      await dashboard.waitForRenderComplete();
      await timePicker.setCommonlyUsedTime('This_week');
    });

    after(async () => {
      await common.navigateToApp('home');
      await home.goToSampleDataPage();
      await home.removeSampleDataSet('flights');
      await home.removeSampleDataSet('logs');
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
      await dashboard.navigateToApp();
      await testSubjects.click('edit-unsaved-New-Dashboard');
      await dashboard.waitForRenderComplete();
      const logsSavedSearchPanel = (await testSubjects.findAll('embeddedSavedSearchDocTable'))[1];
      expect(
        await (
          await logsSavedSearchPanel.findByCssSelector('[data-document-number]')
        ).getAttribute('data-document-number')
      ).to.be('0');
    });
  });
}
