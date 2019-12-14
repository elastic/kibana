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

export default function({ getService, getPageObjects }) {
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header']);

  describe('expanding a panel', () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides other panels', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();
      await retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });

    it('shows other panels after being minimized', async () => {
      const panelCount = await PageObjects.dashboard.getPanelCount();
      // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      // Add a retry to fix https://github.com/elastic/kibana/issues/14574.  Perhaps the recent changes to this
      // being a CSS update is causing the UI to change slower than grabbing the panels?
      retry.try(async () => {
        const panelCountAfterMaxThenMinimize = await PageObjects.dashboard.getPanelCount();
        expect(panelCountAfterMaxThenMinimize).to.be(panelCount);
      });
    });
  });
}
