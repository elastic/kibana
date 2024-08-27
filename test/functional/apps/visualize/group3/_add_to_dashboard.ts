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
  const dashboardExpect = getService('dashboardExpect');
  const dashboardPanelActions = getService('dashboardPanelActions');
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
    before(async () => {
      await PageObjects.visualize.initTests();
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });
    after(async () => {
      await PageObjects.common.unsetTime();
    });
    it('adding a new metric to a new dashboard by value', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('My New Vis 1');

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to a new dashboard by reference', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My Saved New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('My Saved New Vis 1');

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by value', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to a new dashboard
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1 Copy', {
        addToDashboard: 'new',
        saveAsNew: true,
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('My New Vis 1 Copy');

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by reference', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('Another New Vis 1', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to a new dashboard
      await PageObjects.timeToVisualize.saveFromModal('Another New Vis 1 Copy', {
        addToDashboard: 'new',
        saveAsNew: true,
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('Another New Vis 1 Copy');

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to an existing dashboard by value', async function () {
      await PageObjects.dashboard.navigateToApp();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Excellent Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Excellent Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Excellent Dashboard',
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectLinkedToLibrary('My New Vis 2');
    });

    it('adding a new metric to an existing dashboard by reference', async function () {
      await PageObjects.dashboard.navigateToApp();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Wonderful Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My Saved New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectLinkedToLibrary('My Saved New Vis 2');
    });

    it('adding a existing metric to an existing dashboard by value', async function () {
      await PageObjects.dashboard.navigateToApp();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Very Cool Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to an existing dashboard
      await PageObjects.timeToVisualize.saveFromModal('My New Vis 2 Copy', {
        addToDashboard: 'existing',
        dashboardId: 'My Very Cool Dashboard',
        saveAsNew: true,
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Vis 2 Copy');
    });

    it('adding a existing metric to an existing dashboard by reference', async function () {
      await PageObjects.dashboard.navigateToApp();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Very Neat Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Neat Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await PageObjects.timeToVisualize.saveFromModal('Neat Saved Vis 2', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await PageObjects.timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to an existing dashboard
      await PageObjects.timeToVisualize.saveFromModal('Neat Saved Vis 2 Copy', {
        addToDashboard: 'existing',
        dashboardId: 'My Very Neat Dashboard',
        saveAsNew: true,
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectLinkedToLibrary('Neat Saved Vis 2 Copy');
    });
  });
}
