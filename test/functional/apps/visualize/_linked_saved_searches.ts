/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'visualize',
    'header',
    'timePicker',
    'visChart',
  ]);

  describe('saved search visualizations from visualize app', function describeIndexTests() {
    describe('linked saved searched', () => {
      const savedSearchName = 'vis_saved_search';
      let discoverSavedSearchUrlPath: string;

      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await filterBar.addFilter('extension.raw', 'is', 'jpg');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.saveSearch(savedSearchName);
        discoverSavedSearchUrlPath = (await browser.getCurrentUrl()).split('?')[0];
      });

      it('should create a visualization from a saved search', async () => {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickSavedSearch(savedSearchName);
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await retry.waitFor('wait for count to equal 9,109', async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          return data[0][0] === '9,109';
        });
      });

      it('should have a valid link to the saved search from the visualization', async () => {
        await testSubjects.click('showUnlinkSavedSearchPopover');
        await testSubjects.click('viewSavedSearch');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.waitFor('wait discover load its breadcrumbs', async () => {
          const discoverBreadcrumb = await PageObjects.discover.getCurrentQueryName();
          return discoverBreadcrumb === savedSearchName;
        });

        const discoverURLPath = (await browser.getCurrentUrl()).split('?')[0];
        expect(discoverURLPath).to.equal(discoverSavedSearchUrlPath);

        // go back to visualize
        await browser.goBack();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should respect the time filter when linked to a saved search', async () => {
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 21, 2015 @ 10:00:00.000'
        );
        await retry.waitFor('wait for count to equal 3,950', async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          return data[0][0] === '3,950';
        });
      });

      it('should allow adding filters while having a linked saved search', async () => {
        await filterBar.addFilter('bytes', 'is between', '100', '3000');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.waitFor('wait for count to equal 707', async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          return data[0][0] === '707';
        });
      });

      it('should allow unlinking from a linked search', async () => {
        await PageObjects.visualize.clickUnlinkSavedSearch();
        await retry.waitFor('wait for count to equal 707', async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          return data[0][0] === '707';
        });
        // The filter on the saved search should now be in the editor
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);

        // Disabling this filter should now result in different values, since
        // the visualization should not be linked anymore with the saved search.
        await filterBar.toggleFilterEnabled('extension.raw');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.waitFor('wait for count to equal 1,293', async () => {
          const unfilteredData = await PageObjects.visChart.getTableVisContent();
          return unfilteredData[0][0] === '1,293';
        });
      });

      it('should not break when saving after unlinking', async () => {
        await PageObjects.visualize.saveVisualizationExpectSuccess('Unlinked before saved');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.waitFor('wait for count to equal 1,293', async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          return data[0][0] === '1,293';
        });
      });
    });
  });
}
