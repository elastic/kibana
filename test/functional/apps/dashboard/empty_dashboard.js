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
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const dashboardExpect = getService('dashboardExpect');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('empty dashboard', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('should display empty widget', async () => {
      const emptyWidgetExists = await testSubjects.exists('emptyDashboardWidget');
      expect(emptyWidgetExists).to.be(true);
    });

    it('should open add panel when add button is clicked', async () => {
      await testSubjects.click('dashboardAddPanelButton');
      const isAddPanelOpen = await dashboardAddPanel.isAddPanelOpen();
      expect(isAddPanelOpen).to.be(true);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('should add new visualization from dashboard', async () => {
      await testSubjects.exists('addVisualizationButton');
      await testSubjects.click('addVisualizationButton');
      await dashboardVisualizations.createAndAddMarkdown({
        name: 'Dashboard Test Markdown',
        markdown: 'Markdown text',
      });
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.markdownWithValuesExists(['Markdown text']);
    });
  });
}
