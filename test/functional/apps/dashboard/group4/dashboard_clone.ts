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
    const clonedDashboardName = dashboardName + ' Copy';

    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    it('Clone saves a copy', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(
        PageObjects.dashboard.getTestVisualizationNames()
      );
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.clickClone();
      await PageObjects.dashboard.confirmClone();
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

    it('clone appends Copy to the dashboard title name', async () => {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      const title = await PageObjects.dashboard.getCloneTitle();
      expect(title).to.be(clonedDashboardName);
    });

    it('and warns on duplicate name', async function () {
      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
    });

    it("and doesn't save", async () => {
      await PageObjects.dashboard.cancelClone();
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
    });

    it('Clones on confirm duplicate title warning', async function () {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await listingTable.searchAndExpectItemsCount('dashboard', dashboardName + ' Copy', 2);
    });
  });
}
