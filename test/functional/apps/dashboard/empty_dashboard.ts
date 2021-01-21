/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
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
