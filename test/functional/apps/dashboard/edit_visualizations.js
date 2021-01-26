/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common', 'visEditor']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardVisualizations = getService('dashboardVisualizations');

  const originalMarkdownText = 'Original markdown text';
  const modifiedMarkdownText = 'Modified markdown text';

  const createMarkdownVis = async (title) => {
    await testSubjects.click('dashboardAddNewPanelButton');
    await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
    await PageObjects.visualize.clickMarkdownWidget();
    await PageObjects.visEditor.setMarkdownTxt(originalMarkdownText);
    await PageObjects.visEditor.clickGo();
    await PageObjects.visualize.saveVisualizationExpectSuccess(title, {
      saveAsNew: true,
      redirectToOrigin: true,
    });
  };

  const editMarkdownVis = async () => {
    await dashboardPanelActions.openContextMenu();
    await dashboardPanelActions.clickEdit();
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.visEditor.setMarkdownTxt(modifiedMarkdownText);
    await PageObjects.visEditor.clickGo();
  };

  describe('edit visualizations from dashboard', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
    });

    it('save button returns to dashboard after editing visualization with changes saved', async () => {
      const title = 'test save';
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await createMarkdownVis(title);

      await editMarkdownVis();
      await PageObjects.visualize.saveVisualizationAndReturn();

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);
    });

    it('cancel button returns to dashboard after editing visualization without saving', async () => {
      const title = 'test cancel';
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await createMarkdownVis(title);

      await editMarkdownVis();
      await PageObjects.visualize.cancelAndReturn(true);

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
    });

    it('cancel button returns to dashboard with no modal if there are no changes to apply', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.visualize.cancelAndReturn(false);

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
    });
  });
}
