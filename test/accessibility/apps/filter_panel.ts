/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover']);
  const a11y = getService('a11y');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Filter panel', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('discover');
    });

    it('a11y test on add filter panel', async () => {
      await PageObjects.discover.openAddFilterPanel();
      await a11y.testAppSnapshot();
      await PageObjects.discover.closeAddFilterPanel();
      await filterBar.addFilter({ field: 'OriginCityName', operation: 'is', value: 'Rome' });
    });

    it('a11y test on Edit filter as Query DSL panel', async () => {
      await filterBar.clickEditFilter('OriginCityName', 'Rome');
      await testSubjects.click('editQueryDSL');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    // the following tests are for the new saved query panel which also has filter panel options
    it('a11y test on saved query panel- on more than one filters', async () => {
      await filterBar.addFilter({ field: 'DestCountry', operation: 'is', value: 'AU' });
      await testSubjects.click('queryBarMenuPopover');
      await a11y.testAppSnapshot();
    });

    it('a11y test on apply all panel', async () => {
      await testSubjects.click('filter-sets-applyToAllFilters');
      await a11y.testAppSnapshot();
    });
  });
}
