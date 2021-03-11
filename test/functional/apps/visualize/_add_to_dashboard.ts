/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from 'test/functional/ftr_provider_context';
import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardExpect = getService('dashboardExpect');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');

  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'visualize',
    'visEditor',
    'discover',
    'timePicker',
    'timeToVisualize',
  ]);

  describe('Add to Dashboard', function describeIndexTests() {
    it('adding a new metric to a new dashboard', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: 'new',
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: null,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to a new dashboard
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1 Copy', {
        addToDashboard: 'new',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to an existing dashboard', async function () {
      await PageObjects.common.navigateToApp('dashboard');

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Wonderful Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('adding a existing metric to an existing dashboard', async function () {
      await PageObjects.common.navigateToApp('dashboard');

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Very Cool Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: null,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to an existing dashboard
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2 Copy', {
        addToDashboard: 'existing',
        dashboardId: 'My Very Cool Dashboard',
        saveAsNew: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });
  });
}
