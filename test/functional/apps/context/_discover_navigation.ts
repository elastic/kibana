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
  ['extension.raw', 'jpg'],
  ['geo.src', 'IN'],
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'settings',
    'dashboard',
    'context',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('context link in discover', () => {
    before(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();

      for (const columnName of TEST_COLUMN_NAMES) {
        await PageObjects.unifiedFieldList.clickFieldListItemAdd(columnName);
      }

      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await filterBar.addFilter({ field: columnName, operation: 'is', value });
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    it('should open the context view with the selected document as anchor and allows selecting next anchor', async () => {
      /**
       * Helper function to get the first timestamp of the document table
       * @param isAnchorRow - determins if just the anchor row of context should be selected
       */
      const getTimestamp = async (isAnchorRow: boolean = false) => {
        const contextFields = await dataGrid.getFields({ isAnchorRow });
        return contextFields[0][0];
      };
      // get the timestamp of the first row
      const firstDiscoverTimestamp = await getTimestamp();

      // check the anchor timestamp in the context view
      await retry.waitFor('selected document timestamp matches anchor timestamp', async () => {
        // navigate to the context view
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        const anchorTimestamp = await getTimestamp(true);
        return anchorTimestamp === firstDiscoverTimestamp;
      });

      await retry.waitFor('next anchor timestamp matches previous anchor timestamp', async () => {
        // get the timestamp of the first row
        const firstContextTimestamp = await getTimestamp(false);
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        const anchorTimestamp = await getTimestamp(true);
        return anchorTimestamp === firstContextTimestamp;
      });
    });

    it('should open the context view with the same columns', async () => {
      const columnNames = await dataGrid.getHeaderFields();
      expect(columnNames).to.eql(['@timestamp', ...TEST_COLUMN_NAMES]);
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

    it('should navigate to the first document and then back to discover', async () => {
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[0].click();
      });

      const hasDocHit = await testSubjects.exists('doc-hit');
      expect(hasDocHit).to.be(true);

      await testSubjects.click('~breadcrumb & ~first');
      await PageObjects.discover.waitForDiscoverAppOnScreen();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('navigates to doc view from embeddable', async () => {
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
      await rowActions[0].click();
      await PageObjects.common.sleep(250);

      // close popup
      const alert = await browser.getAlert();
      await alert?.accept();
      if (await testSubjects.exists('confirmModalConfirmButton')) {
        await testSubjects.click('confirmModalConfirmButton');
      }

      await retry.waitFor('navigate to doc view', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes('#/doc');
      });
      await retry.waitFor('doc view being rendered', async () => {
        return await PageObjects.discover.isShowingDocViewer();
      });
    });
  });
}
