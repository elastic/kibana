/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'home']);
  const a11y = getService('a11y');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Filter panel', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('kibana_sample_data_flights');
    });

    it('a11y test on add filter panel', async () => {
      await PageObjects.discover.openAddFilterPanel();
      await a11y.testAppSnapshot();
      await PageObjects.discover.closeAddFilterPanel();
      await filterBar.addFilter('OriginCityName', 'is', 'Rome');
    });

    it('a11y test on filter panel with custom label', async () => {
      await filterBar.clickEditFilter('OriginCityName', 'Rome');
      await testSubjects.click('createCustomLabel');
      await a11y.testAppSnapshot();
    });

    it('a11y test on Edit filter as Query DSL panel', async () => {
      await testSubjects.click('editQueryDSL');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    // the following tests filter panel options which changes UI
    it('a11y test on filter panel options panel', async () => {
      await filterBar.addFilter('DestCountry', 'is', 'AU');
      await testSubjects.click('showQueryBarMenu');
      await a11y.testAppSnapshot();
    });

    it('a11y test on disable all filter options view', async () => {
      await testSubjects.click('filter-sets-applyToAllFilters');
      await testSubjects.click('filter-sets-disableAllFilters');
      await a11y.testAppSnapshot();
    });

    it('a11y test on enable all filters view', async () => {
      await testSubjects.click('showQueryBarMenu');
      await testSubjects.click('filter-sets-applyToAllFilters');
      await testSubjects.click('filter-sets-enableAllFilters');
      await a11y.testAppSnapshot();
    });

    it('a11y test on pin all filters view', async () => {
      await testSubjects.click('showQueryBarMenu');
      await testSubjects.click('filter-sets-applyToAllFilters');
      await testSubjects.click('filter-sets-pinAllFilters');
      await a11y.testAppSnapshot();
    });

    it('a11y test on unpin all filters view', async () => {
      await testSubjects.click('showQueryBarMenu');
      await testSubjects.click('filter-sets-applyToAllFilters');
      await testSubjects.click('filter-sets-unpinAllFilters');
      await a11y.testAppSnapshot();
    });

    it('a11y test on invert inclusion of all filters view', async () => {
      await testSubjects.click('showQueryBarMenu');
      await testSubjects.click('filter-sets-applyToAllFilters');
      await testSubjects.click('filter-sets-invertAllFilters');
      await a11y.testAppSnapshot();
    });

    it('a11y test on remove all filtes view', async () => {
      await testSubjects.click('showQueryBarMenu');
      await testSubjects.click('filter-sets-removeAllFilters');
      await a11y.testAppSnapshot();
    });
  });
}
