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
import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('dashboard panel cloning', function viewEditModeTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();
      await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('clones a panel', async () => {
      const initialPanelTitles = await PageObjects.dashboard.getPanelTitles();
      await dashboardPanelActions.clonePanelByTitle(PIE_CHART_VIS_NAME);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const postPanelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
    });

    it('appends a clone title tag', async () => {
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles[1]).to.equal(PIE_CHART_VIS_NAME + ' (copy)');
    });

    it('retains original panel dimensions', async () => {
      const panelDimensions = await PageObjects.dashboard.getPanelDimensions();
      expect(panelDimensions[0]).to.eql(panelDimensions[1]);
    });

    it('gives a correct title to the clone of a clone', async () => {
      const initialPanelTitles = await PageObjects.dashboard.getPanelTitles();
      const clonedPanelName = initialPanelTitles[initialPanelTitles.length - 1];
      await dashboardPanelActions.clonePanelByTitle(clonedPanelName);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const postPanelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
      expect(postPanelTitles[postPanelTitles.length - 1]).to.equal(
        PIE_CHART_VIS_NAME + ' (copy 1)'
      );
    });
  });
}
