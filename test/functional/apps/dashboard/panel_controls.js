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

import {
  PIE_CHART_VIS_NAME,
  AREA_CHART_VIS_NAME,
  LINE_CHART_VIS_NAME,
} from '../../page_objects/dashboard_page';
import { VisualizeConstants } from '../../../../src/legacy/core_plugins/kibana/public/visualize/visualize_constants';

export default function({ getService, getPageObjects }) {
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardReplacePanel = getService('dashboardReplacePanel');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const renderable = getService('renderable');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'discover']);
  const dashboardName = 'Dashboard Panel Controls Test';

  describe('dashboard panel controls', function viewEditModeTests() {
    this.tags('smoke');

    before(async function() {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function() {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('visualization object replace flyout', () => {
      let intialDimensions;
      before(async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        await dashboardAddPanel.addVisualization(LINE_CHART_VIS_NAME);
        intialDimensions = await PageObjects.dashboard.getPanelDimensions();
      });

      after(async function() {
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('replaces old panel with selected panel', async () => {
        await dashboardPanelActions.replacePanelByTitle(PIE_CHART_VIS_NAME);
        await dashboardReplacePanel.replaceEmbeddable(AREA_CHART_VIS_NAME);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles.length).to.be(2);
        expect(panelTitles[0]).to.be(AREA_CHART_VIS_NAME);
      });

      it('replaces selected visualization with old dimensions', async () => {
        const newDimensions = await PageObjects.dashboard.getPanelDimensions();
        expect(intialDimensions[0]).to.eql(newDimensions[0]);
      });

      it('replaced panel persisted correctly when dashboard is hard refreshed', async () => {
        const currentUrl = await browser.getCurrentUrl();
        await browser.get(currentUrl, true);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles.length).to.be(2);
        expect(panelTitles[0]).to.be(AREA_CHART_VIS_NAME);
      });

      it('replaced panel with saved search', async () => {
        const replacedSearch = 'replaced saved search';
        await dashboardVisualizations.createSavedSearch({
          name: replacedSearch,
          fields: ['bytes', 'agent'],
        });
        await PageObjects.header.clickDashboard();
        const inViewMode = await PageObjects.dashboard.getIsInViewMode();
        if (inViewMode) {
          await PageObjects.dashboard.switchToEditMode();
        }
        await dashboardPanelActions.replacePanelByTitle(AREA_CHART_VIS_NAME);
        await dashboardReplacePanel.replaceEmbeddable(replacedSearch, 'search');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles.length).to.be(2);
        expect(panelTitles[0]).to.be(replacedSearch);
      });
    });

    describe('panel edit controls', function() {
      before(async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
      });

      it('are hidden in view mode', async function() {
        await PageObjects.dashboard.saveDashboard(dashboardName);

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.expectMissingEditPanelAction();
        await dashboardPanelActions.expectMissingRemovePanelAction();
      });

      it('are shown in edit mode', async function() {
        await PageObjects.dashboard.switchToEditMode();

        const isContextMenuIconVisible = await dashboardPanelActions.isContextMenuIconVisible();
        expect(isContextMenuIconVisible).to.equal(true);
        await dashboardPanelActions.openContextMenu();

        await dashboardPanelActions.expectExistsEditPanelAction();
        await dashboardPanelActions.expectExistsReplacePanelAction();
        await dashboardPanelActions.expectExistsRemovePanelAction();
      });

      // Based off an actual bug encountered in a PR where a hard refresh in edit mode did not show the edit mode
      // controls.
      it('are shown in edit mode after a hard refresh', async () => {
        const currentUrl = await browser.getCurrentUrl();
        // the second parameter of true will include the timestamp in the url and trigger a hard refresh.
        await browser.get(currentUrl.toString(), true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.expectExistsEditPanelAction();
        await dashboardPanelActions.expectExistsReplacePanelAction();
        await dashboardPanelActions.expectExistsRemovePanelAction();

        // Get rid of the timestamp in the url.
        await browser.get(currentUrl.toString(), false);
      });

      describe('on an expanded panel', function() {
        it('are hidden in view mode', async function() {
          await renderable.waitForRender();
          await PageObjects.dashboard.saveDashboard(dashboardName);
          await dashboardPanelActions.openContextMenu();
          await dashboardPanelActions.clickExpandPanelToggle();
          await dashboardPanelActions.openContextMenu();
          await dashboardPanelActions.expectMissingEditPanelAction();
          await dashboardPanelActions.expectMissingReplacePanelAction();
          await dashboardPanelActions.expectMissingRemovePanelAction();
        });

        it('in edit mode hides remove icons ', async function() {
          await PageObjects.dashboard.switchToEditMode();
          await dashboardPanelActions.openContextMenu();
          await dashboardPanelActions.expectExistsEditPanelAction();
          await dashboardPanelActions.expectExistsReplacePanelAction();
          await dashboardPanelActions.expectMissingRemovePanelAction();
          await dashboardPanelActions.clickExpandPanelToggle();
        });
      });

      describe('visualization object edit menu', () => {
        it('opens a visualization when edit link is clicked', async () => {
          await dashboardPanelActions.openContextMenu();
          await dashboardPanelActions.clickEdit();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(VisualizeConstants.EDIT_PATH);
        });

        it('deletes the visualization when delete link is clicked', async () => {
          await PageObjects.header.clickDashboard();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await dashboardPanelActions.removePanel();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(0);
        });
      });

      describe('saved search object edit menu', () => {
        const searchName = 'my search';
        before(async () => {
          await PageObjects.header.clickDiscover();
          await PageObjects.discover.clickNewSearchButton();
          await dashboardVisualizations.createSavedSearch({ name: searchName, fields: ['bytes'] });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.header.clickDashboard();
          const inViewMode = await PageObjects.dashboard.getIsInViewMode();
          if (inViewMode) {
            await PageObjects.dashboard.switchToEditMode();
          }
          await dashboardAddPanel.addSavedSearch(searchName);

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(1);
        });

        it('opens a saved search when edit link is clicked', async () => {
          await dashboardPanelActions.openContextMenu();
          await dashboardPanelActions.clickEdit();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const queryName = await PageObjects.discover.getCurrentQueryName();
          expect(queryName).to.be(searchName);
        });

        it('deletes the saved search when delete link is clicked', async () => {
          await PageObjects.header.clickDashboard();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await dashboardPanelActions.removePanel();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(0);
        });
      });
    });

    // Panel expand should also be shown in view mode, but only on mouse hover.
    describe('panel expand control', function() {
      it('shown in edit mode', async function() {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.expectExistsToggleExpandAction();
      });
    });
  });
}
