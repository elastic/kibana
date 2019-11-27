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
  const pieChart = getService('pieChart');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'timePicker']);
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('dashboard time picker', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
      await browser.refresh();
    });

    it('Visualization updated when time picker changes', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await pieChart.expectPieSliceCount(0);

      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
      await pieChart.expectPieSliceCount(10);
    });

    it('Saved search updated when time picker changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardVisualizations.createAndAddSavedSearch({ name: 'saved search', fields: ['bytes', 'agent'] });
      await dashboardExpect.docTableFieldCount(150);

      // Set to time range with no data
      await PageObjects.timePicker.setAbsoluteRange('Jan 1, 2000 @ 00:00:00.000', 'Jan 1, 2000 @ 01:00:00.000');
      await dashboardExpect.docTableFieldCount(0);
    });

    it('Timepicker start, end, interval values are set by url', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardVisualizations.createAndAddSavedSearch({ name: 'saved search', fields: ['bytes', 'agent'] });
      const currentUrl = await browser.getCurrentUrl();
      const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
      const urlQuery = `/dashboard?` +
        `_g=(refreshInterval:(pause:!t,value:2000),` +
        `time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&` +
        `_a=(description:'',filters:!()` +
        `)`;
      await browser.get(`${kibanaBaseUrl}#${urlQuery}`, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const time = await PageObjects.timePicker.getTimeConfig();
      const refresh =  await PageObjects.timePicker.getRefreshConfig();
      expect(time.start).to.be('Nov 17, 2012 @ 00:00:00.000');
      expect(time.end).to.be('Nov 17, 2015 @ 18:01:36.621');
      expect(refresh.interval).to.be('2');
    });

    it('Timepicker respects dateFormat from UI settings', async () => {
      await kibanaServer.uiSettings.replace({ 'dateFormat': 'YYYY-MM-DD HH:mm:ss.SSS', });
      await browser.refresh();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      // Same date range as `setTimepickerInHistoricalDataRange`
      await PageObjects.timePicker.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-23 18:31:44.000');
      await pieChart.expectPieSliceCount(10);
    });
  });
}
