/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES = [
  ['extension', 'jpg'],
  ['geo.src', 'IN'],
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'settings',
    'dashboard',
    'header',
  ]);
  const defaultSettings = { defaultIndex: 'logstash-*', 'doc_table:legacy': false };
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const browser = getService('browser');

  // FLAKY: https://github.com/elastic/kibana/issues/94545
  describe.skip('discover data grid context tests', () => {
    before(async () => {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');

      for (const columnName of TEST_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItemAdd(columnName);
      }

      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });
    after(async () => {
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    it('should open the context view with the selected document as anchor', async () => {
      // check the anchor timestamp in the context view
      await retry.waitFor('selected document timestamp matches anchor timestamp ', async () => {
        // get the timestamp of the first row
        const discoverFields = await dataGrid.getFields();
        const firstTimestamp = discoverFields[0][0];

        // navigate to the context view
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        // entering the context view (contains the legacy type)
        const contextFields = await docTable.getFields();
        const anchorTimestamp = contextFields[0][0];
        return anchorTimestamp === firstTimestamp;
      });
    });

    it('should open the context view with the same columns', async () => {
      const columnNames = await docTable.getHeaderFields();
      expect(columnNames).to.eql(['Time', ...TEST_COLUMN_NAMES]);
    });

    it('should open the context view with the filters disabled', async () => {
      let disabledFilterCounter = 0;
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        if (await filterBar.hasFilter(columnName, value, false)) {
          disabledFilterCounter++;
        }
      }
      expect(disabledFilterCounter).to.be(TEST_FILTER_COLUMN_NAMES.length);
    });

    it('navigates to context view from embeddable', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();
      await PageObjects.common.sleep(250);
      // accept alert if it pops up
      const alert = await browser.getAlert();
      await alert?.accept();
      expect(await browser.getCurrentUrl()).to.contain('#/context');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await docTable.getRowsText()).to.have.length(6);
    });
  });
}
