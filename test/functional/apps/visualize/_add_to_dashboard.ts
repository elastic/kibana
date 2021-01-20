/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
