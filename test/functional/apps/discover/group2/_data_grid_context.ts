/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'settings',
    'dashboard',
    'header',
    'unifiedFieldList',
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
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');

      for (const columnName of TEST_COLUMN_NAMES) {
        await PageObjects.unifiedFieldList.clickFieldListItemAdd(columnName);
      }

      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.unifiedFieldList.clickFieldListItem(columnName);
        await PageObjects.unifiedFieldList.clickFieldListPlusFilter(columnName, value);
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

        const contextFields = await dataGrid.getFields();
        const anchorTimestamp = contextFields[0][0];

        return anchorTimestamp === firstTimestamp;
      });
    });

    it('should open the context view with the same columns', async () => {
      const columnNames = await dataGrid.getHeaderFields();
      expect(columnNames).to.eql(['@timestamp', ...TEST_COLUMN_NAMES]);
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
      await testSubjects.existOrFail('dscGridToolbar');
    });

    it('navigates to context view from embeddable', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

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
    });
  });
}
