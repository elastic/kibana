/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const { dashboard, header, visualize, visEditor } = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'common',
    'visEditor',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const originalMarkdownText = 'Original markdown text';
  const modifiedMarkdownText = 'Modified markdown text';

  const createMarkdownVis = async (title) => {
    await dashboardAddPanel.clickAddMarkdownPanel();
    await visEditor.setMarkdownTxt(originalMarkdownText);
    await visEditor.clickGo();
    if (title) {
      await visualize.saveVisualizationExpectSuccess(title, {
        saveAsNew: true,
        redirectToOrigin: true,
      });
    } else {
      await visualize.saveVisualizationAndReturn();
    }
  };

  const editMarkdownVis = async () => {
    await dashboardPanelActions.clickEdit();
    await header.waitUntilLoadingHasFinished();
    await visEditor.setMarkdownTxt(modifiedMarkdownText);
    await visEditor.clickGo();
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
      await dashboard.navigateToApp();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('save button returns to dashboard after editing visualization with changes saved', async () => {
      const title = 'test save';
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      await createMarkdownVis(title);

      await editMarkdownVis();
      await visualize.saveVisualizationAndReturn();

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);
    });

    it('cancel button returns to dashboard after editing visualization without saving', async () => {
      const title = 'test cancel';
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      await createMarkdownVis(title);

      await editMarkdownVis();
      await visualize.cancelAndReturn(true);

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
    });

    it('cancel button returns to dashboard with no modal if there are no changes to apply', async () => {
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();

      await visualize.cancelAndReturn(false);

      const markdownText = await testSubjects.find('markdownBody');
      expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
    });

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was by value', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      // Create markdown by value.
      await createMarkdownVis();

      // Edit then save and return
      await editMarkdownVis();
      await visualize.saveVisualizationAndReturn();

      await header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize Library');
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was linked to dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      // Create markdown by reference.
      await createMarkdownVis('by reference');

      // Edit then save and return
      await editMarkdownVis();
      await visualize.saveVisualizationAndReturn();

      await header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize Library');
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    describe('by value', () => {
      it('save and return button returns to dashboard after editing visualization with changes saved', async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();

        await createMarkdownVis();

        const originalPanelCount = dashboard.getPanelCount();

        await editMarkdownVis();
        await visualize.saveVisualizationAndReturn();

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('cancel button returns to dashboard after editing visualization without saving', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();

        await createMarkdownVis();

        await editMarkdownVis();
        await visualize.cancelAndReturn(true);

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(originalMarkdownText);
      });

      it('save to library button returns to dashboard after editing visualization with changes saved', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();

        await createMarkdownVis();

        const originalPanelCount = dashboard.getPanelCount();

        await editMarkdownVis();
        await visualize.saveVisualization('test save to library', {
          redirectToOrigin: true,
        });

        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('should lose its connection to the dashboard when creating new visualization', async () => {
        await visualize.gotoVisualizationLandingPage();
        await visualize.clickNewVisualization();
        await visualize.clickVisualBuilder();
        await visualize.notLinkedToOriginatingApp();

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
