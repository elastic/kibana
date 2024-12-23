/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardExpect = getService('dashboardExpect');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');

  const { common, dashboard, visualize, timePicker, timeToVisualize } = getPageObjects([
    'common',
    'dashboard',
    'visualize',
    'timePicker',
    'timeToVisualize',
  ]);

  describe('Add to Dashboard', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });
    after(async () => {
      await common.unsetTime();
    });
    it('adding a new metric to a new dashboard by value', async function () {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Vis 1');

      await timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to a new dashboard by reference', async function () {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await timeToVisualize.saveFromModal('My Saved New Vis 1', {
        addToDashboard: 'new',
        saveToLibrary: true,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('My Saved New Vis 1');

      await timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by value', async function () {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await timeToVisualize.saveFromModal('My New Vis 1', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to a new dashboard
      await timeToVisualize.saveFromModal('My New Vis 1 Copy', {
        addToDashboard: 'new',
        saveAsNew: true,
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Vis 1 Copy');

      await timeToVisualize.resetNewDashboard();
    });

    it('adding a existing metric to a new dashboard by reference', async function () {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await timeToVisualize.saveFromModal('Another New Vis 1', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to a new dashboard
      await timeToVisualize.saveFromModal('Another New Vis 1 Copy', {
        addToDashboard: 'new',
        saveAsNew: true,
        saveToLibrary: true,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('Another New Vis 1 Copy');

      await timeToVisualize.resetNewDashboard();
    });

    it('adding a new metric to an existing dashboard by value', async function () {
      await dashboard.navigateToApp();

      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(['Visualization AreaChart']);
      await dashboard.saveDashboard('My Excellent Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Excellent Dashboard', 1);

      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Excellent Dashboard',
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Vis 2');
    });

    it('adding a new metric to an existing dashboard by reference', async function () {
      await dashboard.navigateToApp();

      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(['Visualization AreaChart']);
      await dashboard.saveDashboard('My Wonderful Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      await timeToVisualize.saveFromModal('My Saved New Vis 2', {
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
        saveToLibrary: true,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectLinkedToLibrary('My Saved New Vis 2', false);
    });

    it('adding a existing metric to an existing dashboard by value', async function () {
      await dashboard.navigateToApp();

      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(['Visualization AreaChart']);
      await dashboard.saveDashboard('My Very Cool Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await timeToVisualize.saveFromModal('My New Vis 2', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to an existing dashboard
      await timeToVisualize.saveFromModal('My New Vis 2 Copy', {
        addToDashboard: 'existing',
        dashboardId: 'My Very Cool Dashboard',
        saveAsNew: true,
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Vis 2 Copy');
    });

    it('adding a existing metric to an existing dashboard by reference', async function () {
      await dashboard.navigateToApp();

      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(['Visualization AreaChart']);
      await dashboard.saveDashboard('My Very Neat Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Neat Dashboard', 1);

      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
      await visualize.clickNewSearch();

      await testSubjects.click('visualizeSaveButton');

      // Save this new viz to library
      await timeToVisualize.saveFromModal('Neat Saved Vis 2', {
        addToDashboard: null,
        saveToLibrary: true,
      });

      await testSubjects.click('visualizeSaveButton');

      // All the options should be disabled
      await timeToVisualize.ensureDashboardOptionsAreDisabled();

      // Save a new copy of this viz to an existing dashboard
      await timeToVisualize.saveFromModal('Neat Saved Vis 2 Copy', {
        addToDashboard: 'existing',
        dashboardId: 'My Very Neat Dashboard',
        saveAsNew: true,
        saveToLibrary: true,
      });

      await dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['14,004']);
      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(2);

      await dashboardPanelActions.expectLinkedToLibrary('Neat Saved Vis 2 Copy');
    });

    it('should persist correctly panel title on a by reference visualization', async () => {
      await dashboard.navigateToApp();

      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(['Visualization AreaChart']);

      await dashboardPanelActions.customizePanel();
      await dashboardCustomizePanel.setCustomPanelTitle('My New panel title');
      await dashboardCustomizePanel.clickSaveButton();

      await dashboard.saveDashboard('My Very Entitled Dashboard');

      await dashboard.gotoDashboardLandingPage();
      await listingTable.clickItemLink('dashboard', 'My Very Entitled Dashboard');

      const [newPanelTitle] = await dashboard.getPanelTitles();
      expect(newPanelTitle).to.equal('My New panel title');
    });
  });
}
