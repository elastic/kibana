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

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects, updateBaselines }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common']);
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const esArchiver = getService('esArchiver');

  describe('dashboard snapshots', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('dashboard/current/kibana');
      // We use a really small window to minimize differences across os's and browsers.
      await browser.setScreenshotSize(1000, 500);
    });

    after(async function () {
      await browser.setWindowSize(1300, 900);
      // const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
      // await PageObjects.dashboard.deleteDashboard('area', id);
    });

    it('compare TSVB snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: tsvb-ts');
      await PageObjects.common.closeToast();

      await PageObjects.dashboard.saveDashboard('tsvb');
      await PageObjects.common.closeToast();
      await PageObjects.dashboard.clickFullScreenMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      await PageObjects.dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline('tsvb_dashboard', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      expect(percentDifference).to.be.lessThan(0.02);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/40173
    // This test passes locally for LeeDr but fails every time on Jenkins
    it.skip('compare area chart snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: area with not filter');
      await PageObjects.common.closeToast();
      await PageObjects.dashboard.saveDashboard('area');
      await PageObjects.common.closeToast();

      await PageObjects.dashboard.clickFullScreenMode();
      await screenshot.take('temp_area_chart_full_screen_1');
      await PageObjects.common.sleep(5000);
      await screenshot.take('temp_area_chart_full_screen_2');
      await dashboardPanelActions.openContextMenu();
      await screenshot.take('temp_area_chart_full_screen_3');
      await dashboardPanelActions.clickExpandPanelToggle();
      await PageObjects.common.sleep(5000);

      await PageObjects.dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline('area_chart', updateBaselines);

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      // Testing some OS/browser differences were shown to cause .009 percent difference.
      expect(percentDifference).to.be.lessThan(0.02);
    });
  });
}
