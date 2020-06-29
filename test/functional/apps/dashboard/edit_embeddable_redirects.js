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

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('edit embeddable redirects', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
    });

    it('redirects via save and return button after edit', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.visualize.saveVisualizationAndReturn();
    });

    it('redirects via save as button after edit, renaming itself', async () => {
      const newTitle = 'wowee, looks like I have a new title';
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.visualize.saveVisualizationExpectSuccess(newTitle, {
        saveAsNew: false,
        redirectToOrigin: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount);
      const titles = await PageObjects.dashboard.getPanelTitles();
      expect(titles.indexOf(newTitle)).to.not.be(-1);
    });

    it('redirects via save as button after edit, adding a new panel', async () => {
      const newTitle = 'wowee, my title just got cooler';
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.visualize.saveVisualizationExpectSuccess(newTitle, {
        saveAsNew: true,
        redirectToOrigin: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount + 1);
      const titles = await PageObjects.dashboard.getPanelTitles();
      expect(titles.indexOf(newTitle)).to.not.be(-1);
    });
  });
}
