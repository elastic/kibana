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

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES = [
  ['extension', 'jpg', 'extension.raw'],
  ['geo.src', 'IN', 'geo.src'],
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const { common, discover, timePicker, dashboard, header, unifiedFieldList, context } =
    getPageObjects([
      'common',
      'discover',
      'timePicker',
      'dashboard',
      'header',
      'unifiedFieldList',
      'context',
    ]);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:rowHeightOption': 0, // single line
  };
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const browser = getService('browser');
  const security = getService('security');

  describe('discover data grid context tests', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');

      for (const columnName of TEST_COLUMN_NAMES) {
        await unifiedFieldList.clickFieldListItemAdd(columnName);
      }

      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await unifiedFieldList.clickFieldListItem(columnName);
        await unifiedFieldList.clickFieldListPlusFilter(columnName, value);
      }
    });
    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    it('should open the context view with the same columns', async () => {
      const columnNames = await dataGrid.getHeaderFields();
      expect(columnNames).to.eql(['@timestamp', ...TEST_COLUMN_NAMES]);
    });

    it('should open the context view with the selected document as anchor', async () => {
      // get the timestamp of the first row
      const discoverFields = await dataGrid.getFields();
      const firstTimestamp = discoverFields[0][0];

      // navigate to the context view
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();
      await context.waitUntilContextLoadingHasFinished();

      await dataGrid.clickRowToggle({ isAnchorRow: true });
      await dataGrid.isShowingDocViewer();
      const anchorTimestamp = await testSubjects.getVisibleText('tableDocViewRow-@timestamp-value');

      expect(anchorTimestamp).to.be(firstTimestamp);
    });

    it('should open the context view with the filters disabled', async () => {
      let disabledFilterCounter = 0;
      for (const [_, value, columnId] of TEST_FILTER_COLUMN_NAMES) {
        if (await filterBar.hasFilter(columnId, value, false)) {
          disabledFilterCounter++;
        }
      }
      expect(disabledFilterCounter).to.be(TEST_FILTER_COLUMN_NAMES.length);
    });

    it('should show the the grid toolbar', async () => {
      await testSubjects.existOrFail('unifiedDataTableToolbar');
    });

    it('navigates to context view from embeddable', async () => {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await filterBar.addFilter({ field: 'extension.raw', operation: 'is', value: 'jpg' });
      await header.waitUntilLoadingHasFinished();
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();

      // close popup
      const alert = await browser.getAlert();
      await alert?.accept();
      if (await testSubjects.exists('confirmModalConfirmButton')) {
        await testSubjects.click('confirmModalConfirmButton');
      }

      await retry.waitFor('navigate to context', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes('#/context');
      });
      await retry.waitFor('document table has a length of 6', async () => {
        const nrOfDocs = (await dataGrid.getBodyRows()).length;
        log.debug('document table length', nrOfDocs);
        return nrOfDocs === 6;
      });
      await filterBar.hasFilter('extension.raw', 'jpg', false);
    });
  });
}
