/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

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
    before(async () => {
      await PageObjects.visualize.initTests();
    });
    it('adding a new metric to a new dashboard by value', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists('My New Vis 1');
      expect(isLinked).to.be(false);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to a new dashboard by reference', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

      await testSubjects.click('visualizeSaveButton');

      await PageObjects.timeToVisualize.saveFromModal('My Saved New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My Saved New Vis 1'
      );
      expect(isLinked).to.be(true);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by value', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

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

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My New Vis 1 Copy'
      );
      expect(isLinked).to.be(false);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by reference', async function () {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

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

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Another New Vis 1 Copy'
      );
      expect(isLinked).to.be(true);

      await PageObjects.timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to an existing dashboard by value', async function () {
      await PageObjects.common.navigateToApp('dashboard');

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Excellent Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Excellent Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

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

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists('My New Vis 2');
      expect(isLinked).to.be(false);
    });

    it('adding a new metric to an existing dashboard by reference', async function () {
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

      await PageObjects.timeToVisualize.saveFromModal('My Saved New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
        saveToLibrary: true,
      });

      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My Saved New Vis 2'
      );
      expect(isLinked).to.be(true);
    });

    it('adding a existing metric to an existing dashboard by value', async function () {
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

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'My New Vis 2 Copy'
      );
      expect(isLinked).to.be(false);
    });

    it('adding a existing metric to an existing dashboard by reference', async function () {
      await PageObjects.common.navigateToApp('dashboard');

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(['Visualization AreaChart']);
      await PageObjects.dashboard.saveDashboard('My Very Neat Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Neat Dashboard', 1);

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();

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

      const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
        'Neat Saved Vis 2 Copy'
      );
      expect(isLinked).to.be(true);
    });
  });
}
