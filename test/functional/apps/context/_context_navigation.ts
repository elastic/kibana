/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_FILTER_COLUMN_NAMES = [
  [
    'agent',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
  ],
  ['extension', 'jpg'],
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['common', 'header', 'context', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const find = getService('find');

  const checkMainViewFilters = async () => {
    for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
      expect(await filterBar.hasFilter(columnName, value, true)).to.eql(true);
    }
    expect(await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes()).to.eql({
      start: PageObjects.timePicker.defaultStartTime,
      end: PageObjects.timePicker.defaultEndTime,
    });
  };

  describe('discover - context - back navigation', function contextSize() {
    before(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await filterBar.addFilter({ field: columnName, operation: 'is', value });
      }
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    it('should go back after loading', async function () {
      await retry.waitFor('user navigating to context and returning to discover', async () => {
        // navigate to the context view
        const initialHitCount = await PageObjects.discover.getHitCount();
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await browser.goBack();
        await PageObjects.discover.waitForDocTableLoadingComplete();
        const hitCount = await PageObjects.discover.getHitCount();
        return initialHitCount === hitCount;
      });
    });

    it('should go back via breadcrumbs with preserved state', async function () {
      await retry.waitFor(
        'user navigating to context and returning to discover via breadcrumbs',
        async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
          await rowActions[1].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();

          await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
          await PageObjects.discover.waitForDocTableLoadingComplete();

          await checkMainViewFilters();
          return true;
        }
      );
    });

    it('should go back via breadcrumbs with preserved state after a page refresh', async function () {
      await retry.waitFor(
        'user navigating to context and returning to discover via breadcrumbs',
        async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
          await rowActions[1].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();
          await browser.refresh();
          await PageObjects.context.waitUntilContextLoadingHasFinished();
          await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
          await PageObjects.discover.waitForDocTableLoadingComplete();

          await checkMainViewFilters();
          return true;
        }
      );
    });

    it('should go back via breadcrumbs with updated state after a goBack browser', async function () {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await PageObjects.common.sleep(5000);

      // update url state
      await filterBar.removeFilter('agent');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(2);
      await checkMainViewFilters();

      await browser.goBack();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(1);
      const [filterName, filterValue] = TEST_FILTER_COLUMN_NAMES[1];
      expect(await filterBar.hasFilter(filterName, filterValue, false)).to.eql(true);

      await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(2);
      await checkMainViewFilters();
    });
  });
}
