/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const { common, discover, header, timePicker, dashboard } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'dashboard',
  ]);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:rowHeightOption': 0, // single line
  };
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('discover data grid pagination', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await browser.setWindowSize(1200, 2000);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.clean({ types: ['search'] });
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
    });

    it('should show pagination', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
      // pagination is present
      await testSubjects.existOrFail('pagination-button-0'); // first page
      await testSubjects.existOrFail('pagination-button-4'); // last page
      await testSubjects.missingOrFail('pagination-button-5');
    });

    it('should show footer only for the last page', async () => {
      // footer is not shown
      await testSubjects.missingOrFail('unifiedDataTableFooter');
      // go to next page
      await testSubjects.click('pagination-button-next');
      // footer is not shown yet
      await retry.try(async function () {
        await testSubjects.missingOrFail('unifiedDataTableFooter');
      });
      // go to the last page
      await testSubjects.click('pagination-button-4');
      // footer is shown now
      await retry.try(async function () {
        await testSubjects.existOrFail('unifiedDataTableFooter');
      });
    });

    it('should update pagination when rows per page is changed', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
      await testSubjects.existOrFail('pagination-button-0'); // first page
      await testSubjects.existOrFail('pagination-button-4'); // last page
      await testSubjects.click('tablePaginationPopoverButton');
      await retry.try(async function () {
        return testSubjects.exists('tablePagination-500-rows');
      });
      await testSubjects.click('tablePagination-500-rows');
      await retry.try(async function () {
        return !testSubjects.exists('pagination-button-1'); // only page 0 is left
      });
      await testSubjects.existOrFail('unifiedDataTableFooter');
    });

    it('should render exact number of rows which where configured in the saved search or in settings', async () => {
      await kibanaServer.uiSettings.update({
        ...defaultSettings,
        'discover:sampleSize': 12,
        'discover:sampleRowsPerPage': 6,
        hideAnnouncements: true,
      });

      // first render is based on settings value
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(6);
      await dataGrid.checkCurrentRowsPerPageToBe(6);

      // now we change it via popover
      await dataGrid.changeRowsPerPageTo(10);

      // save as a new search
      const savedSearchTitle = 'search with saved rowsPerPage';
      await discover.saveSearch(savedSearchTitle);

      // start a new search session
      await testSubjects.click('discoverNewButton');
      await header.waitUntilLoadingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(6); // as in settings
      await dataGrid.checkCurrentRowsPerPageToBe(6);

      // open the saved search
      await discover.loadSavedSearch(savedSearchTitle);
      await discover.waitUntilSearchingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(10); // as in the saved search
      await dataGrid.checkCurrentRowsPerPageToBe(10);

      // should use "rowsPerPage" form the saved search on dashboard
      await common.navigateToApp('dashboard');
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultAbsoluteRange();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(savedSearchTitle);
      await header.waitUntilLoadingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(10); // as in the saved search
      await dataGrid.checkCurrentRowsPerPageToBe(10);

      // should use "rowsPerPage" form settings by default on dashboard
      await dashboardPanelActions.removePanelByTitle(savedSearchTitle);
      await dashboardAddPanel.addSavedSearch('A Saved Search');
      await header.waitUntilLoadingHasFinished();
      expect((await dataGrid.getDocTableRows()).length).to.be(6); // as in settings
      await dataGrid.checkCurrentRowsPerPageToBe(6);
    });

    it('should not split ES|QL results into pages', async () => {
      const rowsPerPage = 5;
      const savedSearchESQL = 'testESQLPagination';
      await kibanaServer.uiSettings.update({
        ...defaultSettings,
        'discover:sampleRowsPerPage': rowsPerPage,
        hideAnnouncements: true,
      });

      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();

      // expect pagination to be present for data view mode
      expect((await dataGrid.getDocTableRows()).length).to.be(rowsPerPage);
      await dataGrid.checkCurrentRowsPerPageToBe(rowsPerPage);
      await testSubjects.existOrFail('pagination-button-0');

      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      // expect no pagination for ES|QL mode
      expect((await dataGrid.getDocTableRows()).length).to.above(rowsPerPage);
      await testSubjects.missingOrFail('pagination-button-0');

      await discover.saveSearch(savedSearchESQL);

      await common.navigateToApp('dashboard');

      await dashboard.clickNewDashboard();
      await timePicker.setDefaultAbsoluteRange();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(savedSearchESQL);
      await header.waitUntilLoadingHasFinished();

      // expect no pagination for ES|QL mode on Dashboard
      expect((await dataGrid.getDocTableRows()).length).to.above(rowsPerPage);
      await testSubjects.missingOrFail('pagination-button-0');
    });
  });
}
