/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard clone', function describeIndexTests() {
    const dashboardName = 'Dashboard Clone Test';
    const clonedDashboardName = dashboardName + ' (1)';

    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    it('Clone saves a copy', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(
        PageObjects.dashboard.getTestVisualizationNames()
      );
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.duplicateDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', clonedDashboardName, 1);
    });

    it('the copy should have all the same visualizations', async function () {
      await PageObjects.dashboard.loadSavedDashboard(clonedDashboardName);
      await retry.try(async () => {
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
      });
    });
  });
}
