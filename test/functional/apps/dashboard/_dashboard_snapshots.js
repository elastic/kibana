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

import expect from 'expect.js';

import { AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';


export default function ({ getService, getPageObjects, updateBaselines }) {
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common']);
  const screenshot = getService('screenshots');
  const remote = getService('remote');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');

  describe('dashboard snapshots', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await remote.setWindowSize(1000, 500);
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    // This one won't work because of https://github.com/elastic/kibana/issues/15501.  See if we can get it to work
    // once TSVB has timezone support.
    it.skip('compare TSVB snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await dashboardVisualizations.createAndAddTSVBVisualization('TSVB');
      await testSubjects.click('toastCloseButton');

      await PageObjects.dashboard.saveDashboard('tsvb');
      await testSubjects.click('saveDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.clickFullScreenMode();
      await dashboardPanelActions.toggleExpandPanel();

      await PageObjects.dashboard.waitForRenderComplete();
      const percentSimilar = await screenshot.compareAgainstBaseline('tsvb_dashboard', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      expect(percentSimilar).to.be(0);
    });

    it('compare area chart snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.dashboard.addVisualizations([AREA_CHART_VIS_NAME]);
      await testSubjects.click('addVisualizationToDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.saveDashboard('area');
      await testSubjects.click('saveDashboardSuccess toastCloseButton');

      await PageObjects.dashboard.clickFullScreenMode();
      await dashboardPanelActions.toggleExpandPanel();

      await PageObjects.dashboard.waitForRenderComplete();
      // The need for this should have been removed with https://github.com/elastic/kibana/pull/15574 but the
      // test failed when removed because the visualization hadn't settled.
      await PageObjects.common.sleep(1000);

      const percentSimilar = await screenshot.compareAgainstBaseline('area_chart', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      // Testing some OS/browser differnces were shown to cause .009 percent difference.
      expect(percentSimilar).to.be.lessThan(0.05);
    });
  });
}
