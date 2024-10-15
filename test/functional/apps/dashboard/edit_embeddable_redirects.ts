/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('edit embeddable redirects', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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

    it('loses originatingApp connection after save as when redirectToOrigin is false', async () => {
      const newTitle = 'wowee, my title just got cooler again';
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.visualize.linkedToOriginatingApp();
      await PageObjects.visualize.saveVisualizationExpectSuccess(newTitle, {
        saveAsNew: true,
        redirectToOrigin: false,
      });
      await PageObjects.visualize.notLinkedToOriginatingApp();
      await PageObjects.common.navigateToApp('dashboard');
    });

    it('loses originatingApp connection after first save when redirectToOrigin is false', async () => {
      const newTitle = 'test create panel originatingApp';
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      await dashboardAddPanel.clickMarkdownQuickButton();
      await PageObjects.visualize.saveVisualizationExpectSuccess(newTitle, {
        saveAsNew: true,
        redirectToOrigin: false,
      });
      await PageObjects.visualize.notLinkedToOriginatingApp();
    });
  });
}
