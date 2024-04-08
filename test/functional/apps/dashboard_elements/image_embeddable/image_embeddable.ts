/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'discover', 'header']);
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');

  describe('image embeddable', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();
    });

    it('should create an image embeddable', async () => {
      // create an image embeddable
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewEmbeddableLink('image');
      await testSubjects.exists(`createImageEmbeddableFlyout`);
      await PageObjects.common.setFileInputPath(require.resolve('./elastic_logo.png'));
      await testSubjects.clickWhenNotDisabled(`imageEmbeddableEditorSave`);

      // check that it is added on the dashboard
      expect(await PageObjects.dashboard.getSharedItemsCount()).to.be('1');
      await PageObjects.dashboard.waitForRenderComplete();
      const panel = (await PageObjects.dashboard.getDashboardPanels())[0];
      const img = await panel.findByCssSelector('img.euiImage');
      const imgSrc = await img.getAttribute('src');
      expect(imgSrc).to.contain(`files/defaultImage`);
    });

    it('image embeddable should support drilldowns', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickContextMenuMoreItem();
      await dashboardDrilldownPanelActions.expectExistsCreateDrilldownAction();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();

      await testSubjects.click('actionFactoryItem-DASHBOARD_TO_DASHBOARD_DRILLDOWN');
      await dashboardDrilldownsManage.fillInDashboardToDashboardDrilldownWizard({
        drilldownName: `My drilldown`,
        destinationDashboardTitle: `few panels`,
      });

      await dashboardDrilldownsManage.saveChanges();
      await dashboardDrilldownsManage.closeFlyout();

      expect(await PageObjects.dashboard.getPanelDrilldownCount()).to.be(1);

      const panel = (await PageObjects.dashboard.getDashboardPanels())[0];
      const img = await panel.findByCssSelector('img.euiImage');

      const oldDashboardId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();

      await img.click();

      await retry.waitFor('navigate to different dashboard', async () => {
        const newDashboardId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        return typeof newDashboardId === 'string' && oldDashboardId !== newDashboardId;
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
    });
  });
}
