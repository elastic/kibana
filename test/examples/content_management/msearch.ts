/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'home', 'header']);
  const listingTable = getService('listingTable');

  describe('MSearch demo', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
    });
    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    it('MSearch demo works', async () => {
      const appId = 'contentManagementExamples';
      await PageObjects.common.navigateToApp(appId, {
        path: 'msearch',
      });

      await listingTable.waitUntilTableIsLoaded();
      await listingTable.searchForItemWithName('Origin Time Delayed');

      await testSubjects.existOrFail(
        `cm-msearch-tableListingTitleLink-[Flights]-Origin-Time-Delayed`
      );
    });
  });
}
