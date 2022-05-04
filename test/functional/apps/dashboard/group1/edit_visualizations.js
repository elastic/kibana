/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common', 'visEditor']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const originalMarkdownText = 'Original markdown text';
  const modifiedMarkdownText = 'Modified markdown text';

  const createMarkdownVis = async (title) => {
    await dashboardAddPanel.clickMarkdownQuickButton();
    await PageObjects.visEditor.setMarkdownTxt(originalMarkdownText);
    await PageObjects.visEditor.clickGo();
    if (title) {
      await PageObjects.visualize.saveVisualizationExpectSuccess(title, {
        saveAsNew: true,
        redirectToOrigin: true,
      });
    } else {
      await PageObjects.visualize.saveVisualizationAndReturn();
    }
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
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was by value', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      // Create markdown by value.
      await createMarkdownVis();

      // Edit then save and return
      await editMarkdownVis();
      await PageObjects.visualize.saveVisualizationAndReturn();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize Library');
      await PageObjects.common.clickConfirmOnModal();
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was linked to dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      // Create markdown by reference.
      await createMarkdownVis('by reference');

      // Edit then save and return
      await editMarkdownVis();
      await PageObjects.visualize.saveVisualizationAndReturn();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize Library');
      await PageObjects.common.clickConfirmOnModal();
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    describe('by value', () => {
      it('save and return button returns to dashboard after editing visualization with changes saved', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();

        await createMarkdownVis();

        const originalPanelCount = PageObjects.dashboard.getPanelCount();

        await editMarkdownVis();
        await PageObjects.visualize.saveVisualizationAndReturn();

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('cancel button returns to dashboard after editing visualization without saving', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();

        await createMarkdownVis();

        await editMarkdownVis();
        await PageObjects.visualize.cancelAndReturn(true);

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
      });

      it('save to library button returns to dashboard after editing visualization with changes saved', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();

        await createMarkdownVis();

        const originalPanelCount = PageObjects.dashboard.getPanelCount();

        await editMarkdownVis();
        await PageObjects.visualize.saveVisualization('test save to library', {
          redirectToOrigin: true,
        });

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('should lose its connection to the dashboard when creating new visualization', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.clickNewVisualization();
        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visualize.notLinkedToOriginatingApp();

        // return to origin should not be present in save modal
        await testSubjects.click('visualizeSaveButton');
        const redirectToOriginCheckboxExists = await testSubjects.exists(
          'returnToOriginModeSwitch'
        );
        expect(redirectToOriginCheckboxExists).to.be(false);
      });
    });
  });
}
