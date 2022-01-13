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
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'context', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const find = getService('find');

  describe('discover - context - back navigation', function contextSize() {
    before(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
      await PageObjects.common.navigateToApp('discover');
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    it('should go back after loading', async function () {
      await retry.waitFor('user navigating to context and returning to discover', async () => {
        // navigate to the context view
        const initialHitCount = await PageObjects.discover.getHitCount();
        await docTable.clickRowToggle({ rowIndex: 0 });
        const rowActions = await docTable.getRowActions({ rowIndex: 0 });
        await rowActions[0].click();
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
          await docTable.clickRowToggle({ rowIndex: 0 });
          const rowActions = await docTable.getRowActions({ rowIndex: 0 });
          await rowActions[0].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();

          await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
          await PageObjects.discover.waitForDocTableLoadingComplete();

          for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
            expect(await filterBar.hasFilter(columnName, value)).to.eql(true);
          }
          expect(await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes()).to.eql({
            start: 'Sep 18, 2015 @ 06:31:44.000',
            end: 'Sep 23, 2015 @ 18:31:44.000',
          });
          return true;
        }
      );
    });
  });
}
