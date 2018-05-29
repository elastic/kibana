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

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const remote = getService('remote');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header']);

  describe('expanding a panel', () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides other panels', async () => {
      await dashboardPanelActions.toggleExpandPanel();
      await retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });

    it('does not show the spy pane toggle if mouse is not hovering', async () => {
      // move mouse off the panel.
      await PageObjects.header.clickTimepicker();

      // no spy pane without hover
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(false);
    });

    it('shows the spy pane toggle on hover', async () => {
      const panels = await PageObjects.dashboard.getDashboardPanels();
      // Simulate hover
      await remote.moveMouseTo(panels[0]);
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });

    // This was an actual bug that appeared, where the spy pane appeared on panels after adding them, but
    // disappeared when a new dashboard was opened up.
    it('shows the spy pane toggle directly after opening a dashboard', async () => {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.saveDashboard('spy pane test', { saveAsNew: true });
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('spy pane test');
      const panels = await PageObjects.dashboard.getDashboardPanels();
      // Simulate hover
      await remote.moveMouseTo(panels[1]);
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });

    it('shows other panels after being minimized', async () => {
      const panelCount = await PageObjects.dashboard.getPanelCount();
      // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
      await dashboardPanelActions.toggleExpandPanel();
      await dashboardPanelActions.toggleExpandPanel();


      // Add a retry to fix https://github.com/elastic/kibana/issues/14574.  Perhaps the recent changes to this
      // being a CSS update is causing the UI to change slower than grabbing the panels?
      retry.try(async () => {
        const panelCountAfterMaxThenMinimize = await PageObjects.dashboard.getPanelCount();
        expect(panelCountAfterMaxThenMinimize).to.be(panelCount);
      });
    });
  });

}
