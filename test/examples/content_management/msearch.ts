/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
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
      const items = await listingTable.getAllItemsNames();
      const expectExists = [
        `kibana_sample_data_flights`,
        `[Flights] Airport Connections (Hover Over Airport)`,
        `[Flights] Departures Count Map`,
        `[Flights] Global Flight Dashboard`,
        `[Flights] Origin Time Delayed`,
        `[Flights] Flight Log`,
      ];

      expectExists.forEach((item) => {
        expect(items.includes(item)).to.be(true);
      });
    });
  });
}
