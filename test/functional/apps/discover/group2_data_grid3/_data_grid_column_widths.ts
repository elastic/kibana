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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
  ]);
  const security = getService('security');

  const testResizeColumn = async (field: string) => {
    const { originalWidth, newWidth } = await dataGrid.resizeColumn(field, -100);
    expect(newWidth).to.be(originalWidth - 100);
    await dataGrid.clickResetColumnWidth(field);
    const resetWidth = (await (await dataGrid.getHeaderElement(field)).getSize()).width;
    expect(resetWidth).to.be(originalWidth);
  };

  describe('discover data grid column widths', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should not show reset width button for auto width column', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      expect(await dataGrid.resetColumnWidthExists('@message')).to.be(false);
    });

    it('should show reset width button for absolute width column, and allow resetting to auto width', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      await testResizeColumn('@message');
    });

    it('should reset the last column to auto width if only absolute width columns remain', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      const { originalWidth: messageOriginalWidth, newWidth: messageNewWidth } =
        await dataGrid.resizeColumn('@message', -300);
      expect(messageNewWidth).to.be(messageOriginalWidth - 300);
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      const { originalWidth: bytesOriginalWidth, newWidth: bytesNewWidth } =
        await dataGrid.resizeColumn('bytes', -100);
      expect(bytesNewWidth).to.be(bytesOriginalWidth - 100);
      let messageWidth = (await (await dataGrid.getHeaderElement('@message')).getSize()).width;
      expect(messageWidth).to.be(messageNewWidth);
      await dataGrid.clickRemoveColumn('bytes');
      messageWidth = (await (await dataGrid.getHeaderElement('@message')).getSize()).width;
      expect(messageWidth).to.be(messageOriginalWidth);
    });

    it('should not reset the last column to auto width when there are remaining auto width columns', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      const { originalWidth: bytesOriginalWidth, newWidth: bytesNewWidth } =
        await dataGrid.resizeColumn('bytes', -200);
      expect(bytesNewWidth).to.be(bytesOriginalWidth - 200);
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('agent');
      const { originalWidth: agentOriginalWidth, newWidth: agentNewWidth } =
        await dataGrid.resizeColumn('agent', -100);
      expect(agentNewWidth).to.be(agentOriginalWidth - 100);
      await dataGrid.clickRemoveColumn('bytes');
      const agentWidth = (await (await dataGrid.getHeaderElement('agent')).getSize()).width;
      expect(agentWidth).to.be(agentNewWidth);
    });

    it('should allow resetting column width in surrounding docs view', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [, surroundingActionEl] = await dataGrid.getRowActions({ rowIndex: 0 });
      await surroundingActionEl.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testResizeColumn('@message');
    });

    it('should allow resetting column width in Dashboard panel', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch('A Saved Search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testResizeColumn('_source');
    });

    it('should use custom column width on Dashboard when specified', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch('A Saved Search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const { originalWidth, newWidth } = await dataGrid.resizeColumn('_source', -100);
      expect(newWidth).to.be(originalWidth - 100);
      await PageObjects.dashboard.saveDashboard('test');
      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const initialWidth = (await (await dataGrid.getHeaderElement('_source')).getSize()).width;
      expect(initialWidth).to.be(newWidth);
    });
  });
}
