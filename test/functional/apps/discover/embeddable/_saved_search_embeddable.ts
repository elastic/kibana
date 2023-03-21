/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);

  describe('discover saved search embeddable', () => {
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
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 22, 2015 @ 00:00:00.000',
        'Sep 23, 2015 @ 00:00:00.000'
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const addSearchEmbeddableToDashboard = async () => {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    const refreshDashboardPage = async () => {
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
    };

    it('can save a search embeddable with a defined rows per page number', async function () {
      const dashboardName = 'Dashboard with a Paginated Saved Search';
      await addSearchEmbeddableToDashboard();
      await dataGrid.checkCurrentRowsPerPageToBe(100);

      await PageObjects.dashboard.saveDashboard(dashboardName, {
        waitDialogIsClosed: true,
        exitFromEditMode: false,
      });

      await refreshDashboardPage();

      await dataGrid.checkCurrentRowsPerPageToBe(100);

      await dataGrid.changeRowsPerPageTo(10);

      await PageObjects.dashboard.saveDashboard(dashboardName);
      await refreshDashboardPage();

      await dataGrid.checkCurrentRowsPerPageToBe(10);
    });

    it('should control columns correctly', async () => {
      await PageObjects.dashboard.switchToEditMode();

      const cell = await dataGrid.getCellElement(0, 2);
      expect(await cell.getVisibleText()).to.be('Sep 22, 2015 @ 23:50:13.253');
      await dataGrid.clickMoveColumnLeft('agent');

      const cellAfter = await dataGrid.getCellElement(0, 2);
      expect(await cellAfter.getVisibleText()).to.be(
        'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)'
      );

      await dataGrid.clickRemoveColumn('agent');
      expect(await cell.getVisibleText()).to.be('Sep 22, 2015 @ 23:50:13.253');
    });

    it('should render duplicate saved search embeddables', async () => {
      await addSearchEmbeddableToDashboard();
      const [firstGridCell, secondGridCell] = await dataGrid.getAllCellElements();
      const firstGridCellContent = await firstGridCell.getVisibleText();
      const secondGridCellContent = await secondGridCell.getVisibleText();

      expect(firstGridCellContent).to.be.equal(secondGridCellContent);
    });
  });
}
