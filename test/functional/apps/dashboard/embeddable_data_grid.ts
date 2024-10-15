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
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');

  describe('dashboard embeddable data grid', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
        'doc_table:legacy': false,
      });
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultDataRange();
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
    });

    after(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should expand the detail row when the toggle arrow is clicked', async function () {
      await retry.try(async function () {
        await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: 0 });
        const detailsEl = await dataGrid.getDetailsRows();
        const defaultMessageEl = await detailsEl[0].findByTestSubject('docTableRowDetailsTitle');
        expect(defaultMessageEl).to.be.ok();
        await dataGrid.closeFlyout();
      });
    });

    it('are added when a cell filter is clicked', async function () {
      await find.clickByCssSelector(`[role="gridcell"]:nth-child(4)`);
      // needs a short delay between becoming visible & being clickable
      await PageObjects.common.sleep(250);
      await find.clickByCssSelector(`[data-test-subj="filterOutButton"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await find.clickByCssSelector(`[role="gridcell"]:nth-child(4)`);
      await PageObjects.common.sleep(250);
      await find.clickByCssSelector(`[data-test-subj="filterForButton"]`);
      const filterCount = await filterBar.getFilterCount();
      expect(filterCount).to.equal(2);
    });
  });
}
