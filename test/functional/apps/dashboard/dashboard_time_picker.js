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

import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const inspector = getService('inspector');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const pieChart = getService('pieChart');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'timePicker']);

  describe('dashboard time picker', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await dashboardVisualizations.createAndAddSavedSearch({ name: 'saved search', fields: ['bytes', 'agent'] });
      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
    });

    it('Saved search updated when time picker changes', async () => {
      await dashboardExpect.docTableFieldCount(150);

      // Set to time range with no data
      await PageObjects.timePicker.setAbsoluteRange('2000-01-01 00:00:00.000', '2000-01-01 01:00:00.000');
      await dashboardExpect.docTableFieldCount(0);
    });

    it('Visualization updated when time picker changes', async () => {
      await pieChart.expectPieSliceCount(0);

      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
      await pieChart.expectPieSliceCount(10);
    });

    it('visualization re-fetch documents with refresh timer', async () => {
      await PageObjects.timePicker.setRefreshInterval('1', 'seconds');
      await dashboardPanelActions.openInspectorByTitle(PIE_CHART_VIS_NAME);
      await inspector.openInspectorRequestsView();
      const beforeRefreshTimerTimestamp = await inspector.getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.timePicker.triggerSingleRefresh(1000);
      await dashboardPanelActions.openInspectorByTitle(PIE_CHART_VIS_NAME);
      await inspector.openInspectorRequestsView();
      const afterRefreshTimerTimestamp = await inspector.getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });

    it('saved search re-fetch documents with refresh timer', async () => {
      await dashboardPanelActions.openInspectorByTitle('saved search');
      const beforeRefreshTimerTimestamp = await inspector.getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp.length).to.be(24);
      await PageObjects.timePicker.triggerSingleRefresh(1000);
      await dashboardPanelActions.openInspectorByTitle('saved search');
      const afterRefreshTimerTimestamp = await inspector.getRequestTimestamp();
      expect(beforeRefreshTimerTimestamp).not.to.equal(afterRefreshTimerTimestamp);
    });
  });
}
