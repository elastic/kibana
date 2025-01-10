/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, discover, share, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'share',
    'timePicker',
    'unifiedFieldList',
  ]);
  const dataGrid = getService('dataGrid');
  const a11y = getService('a11y');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const TEST_COLUMN_NAMES = ['dayOfWeek', 'DestWeather'];
  const toasts = getService('toasts');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Discover a11y tests', () => {
    before(async () => {
      await common.navigateToApp('discover');
      await discover.selectIndexPattern('Kibana Sample Data Flights');
      await timePicker.setCommonlyUsedTime('Last_7 days');
    });

    it('Discover main page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test on save button', async () => {
      await discover.clickSaveSearchButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test on save search panel', async () => {
      await discover.inputSavedSearchTitle('a11ySearch');
      await a11y.testAppSnapshot();
    });

    it('a11y test on clicking on confirm save', async () => {
      await discover.clickConfirmSavedSearch();
      await a11y.testAppSnapshot();
    });

    it('a11y test on click new to reload discover', async () => {
      await discover.clickNewSearchButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test on load saved search panel', async () => {
      await discover.openLoadSavedSearchPanel();
      await a11y.testAppSnapshot();
      await discover.closeLoadSavedSearchPanel();
    });

    it('a11y test on inspector panel', async () => {
      await inspector.open();
      await a11y.testAppSnapshot();
      await inspector.close();
    });

    it('a11y test on share panel', async () => {
      await share.clickShareTopNavButton();
      await a11y.testAppSnapshot();
      await share.closeShareModal();
    });

    it('a11y test on open sidenav filter', async () => {
      await share.closeShareModal();
      await unifiedFieldList.openSidebarFieldFilter();
      await a11y.testAppSnapshot();
      await unifiedFieldList.closeSidebarFieldFilter();
    });

    it('a11y test on tables with columns view', async () => {
      for (const columnName of TEST_COLUMN_NAMES) {
        await unifiedFieldList.clickFieldListItemToggle(columnName);
      }
      await a11y.testAppSnapshot();
    });

    it('a11y test on save queries popover', async () => {
      await discover.clickSavedQueriesPopOver();
      await a11y.testAppSnapshot();
    });

    it('a11y test on save queries panel', async () => {
      await discover.clickCurrentSavedQuery();
      await a11y.testAppSnapshot();
    });

    it('a11y test on toggle include filters option on saved queries panel', async () => {
      await discover.setSaveQueryFormTitle('test');
      await discover.toggleIncludeFilters();
      await a11y.testAppSnapshot();
      await discover.saveCurrentSavedQuery();
    });

    it('a11y test on saved queries list panel', async () => {
      await savedQueryManagementComponent.loadSavedQuery('test');
      await discover.clickSavedQueriesPopOver();
      await testSubjects.click('saved-query-management-load-button');
      await savedQueryManagementComponent.deleteSavedQuery('test');
      await a11y.testAppSnapshot({
        // The saved query selectable search input has invalid aria attrs after
        // the query is deleted and the `emptyMessage` is displayed, and it fails
        // with this error, likely because the list is replaced by `emptyMessage`:
        // [aria-valid-attr-value]: Ensures all ARIA attributes have valid values
        excludeTestSubj: ['saved-query-management-search-input'],
      });
    });

    // adding a11y tests for the new data grid
    it('a11y test on single document view', async () => {
      await dataGrid.clickRowToggle();
      await a11y.testAppSnapshot();
    });

    it('a11y test on JSON view of the document', async () => {
      await discover.clickDocViewerTab('doc_view_source');
      await a11y.testAppSnapshot();
    });

    it('a11y test for actions on a field', async () => {
      await discover.clickDocViewerTab('doc_view_table');
      await dataGrid.expandFieldNameCellInFlyout('Cancelled');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for data-grid table with columns', async () => {
      await retry.try(async () => {
        await dataGrid.clickFieldActionInFlyout('Cancelled', 'toggleColumnButton');
      });

      await retry.try(async () => {
        await dataGrid.clickFieldActionInFlyout('Carrier', 'toggleColumnButton');
      });

      await retry.try(async () => {
        await testSubjects.click('euiFlyoutCloseButton');
      });

      await retry.try(async () => {
        await toasts.dismissAll();
      });

      await a11y.testAppSnapshot();
    });

    it('a11y test for data-grid actions on columns', async () => {
      await dataGrid.openColMenuByField('Carrier');
      await a11y.testAppSnapshot();
    });

    it('a11y test for data grid with hidden chart', async () => {
      await discover.closeHistogramPanel();
      await a11y.testAppSnapshot();
      await discover.openHistogramPanel();
    });

    it('a11y test for time interval panel', async () => {
      await testSubjects.click('unifiedHistogramTimeIntervalSelectorButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test for data grid sort panel', async () => {
      await testSubjects.click('dataGridColumnSortingButton');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for setting row height for display panel', async () => {
      await testSubjects.click('dataGridDisplaySelectorPopover');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for data grid in full screen', async () => {
      await testSubjects.click('dataGridFullScreenButton');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('a11y test for field statistics data grid view', async () => {
      await discover.clickViewModeFieldStatsButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test for data grid with collapsed side bar', async () => {
      await discover.closeSidebar();
      await a11y.testAppSnapshot();
      await discover.openSidebar();
    });

    it('a11y test for adding a field from side bar', async () => {
      await testSubjects.click('dataView-add-field_btn');
      await a11y.testAppSnapshot();
    });
  });
}
