/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);

  describe('dashboard embeddable data grid', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('dashboard/current/data');
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
        'doc_table:legacy': false,
      });
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultDataRange();
    });

    describe('saved search filters', function () {
      it('are added when a cell filter is clicked', async function () {
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
        await find.clickByCssSelector(`[role="gridcell"]:nth-child(2)`);
        await find.clickByCssSelector(`[data-test-subj="filterOutButton"]`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await find.clickByCssSelector(`[role="gridcell"]:nth-child(2)`);
        await find.clickByCssSelector(`[data-test-subj="filterForButton"]`);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(2);
      });
    });
  });
}
