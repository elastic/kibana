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
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'common']);
  const filterBar = getService('filterBar');

  describe('full screen mode', () => {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('option not available in edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(false);
    });

    it('available in view mode', async () => {
      await PageObjects.dashboard.saveDashboard('full screen test', {
        saveAsNew: true,
        exitFromEditMode: true,
      });
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(true);
    });

    it('hides the chrome', async () => {
      const isChromeVisible = await PageObjects.common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      await PageObjects.dashboard.clickFullScreenMode();

      await retry.try(async () => {
        const isChromeHidden = await PageObjects.common.isChromeHidden();
        expect(isChromeHidden).to.be(true);
      });
    });

    it('displays exit full screen logo button', async () => {
      const exists = await PageObjects.dashboard.exitFullScreenLogoButtonExists();
      expect(exists).to.be(true);
    });

    it('displays exit full screen logo button when panel is expanded', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      const exists = await PageObjects.dashboard.exitFullScreenTextButtonExists();
      expect(exists).to.be(true);
    });

    it('exits when the text button is clicked on', async () => {
      await PageObjects.dashboard.exitFullScreenMode();
      await retry.try(async () => {
        const isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });

    it('shows filter bar in fullscreen mode', async () => {
      await filterBar.addFilter('bytes', 'is', '12345678');
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.clickFullScreenMode();
      await retry.try(async () => {
        const isChromeHidden = await PageObjects.common.isChromeHidden();
        expect(isChromeHidden).to.be(true);
      });
      expect(await filterBar.getFilterCount()).to.be(1);
      await PageObjects.dashboard.clickExitFullScreenLogoButton();
      await retry.try(async () => {
        const isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
      await filterBar.removeFilter('bytes');
    });
  });
}
