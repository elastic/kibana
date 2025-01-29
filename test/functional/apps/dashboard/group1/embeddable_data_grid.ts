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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const { dashboard, header, timePicker } = getPageObjects(['dashboard', 'header', 'timePicker']);
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
      });
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await header.waitUntilLoadingHasFinished();
    });

    after(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should expand the detail row when the toggle arrow is clicked', async function () {
      await retry.try(async function () {
        await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: 0 });
        const detailsEl = await dataGrid.getDetailsRows();
        const defaultMessageEl = await detailsEl[0].findByTestSubject('docViewerRowDetailsTitle');
        expect(defaultMessageEl).to.be.ok();
        await dataGrid.closeFlyout();
      });
    });

    it('are added when a cell filter is clicked', async function () {
      const gridCell = '[role="gridcell"]:nth-child(4)';
      const filterOutButton = '[data-test-subj="filterOutButton"]';
      const filterForButton = '[data-test-subj="filterForButton"]';
      await retry.try(async () => {
        await find.clickByCssSelector(gridCell);
        await find.clickByCssSelector(filterOutButton);
        await header.waitUntilLoadingHasFinished();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });
      await header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        await find.clickByCssSelector(gridCell);
        await find.clickByCssSelector(filterForButton);
        await header.waitUntilLoadingHasFinished();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(2);
      });
    });
  });
}
