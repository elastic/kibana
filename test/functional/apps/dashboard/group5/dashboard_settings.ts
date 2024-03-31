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
  const retry = getService('retry');
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const kibanaServer = getService('kibanaServer');
  const dashboardSettings = getService('dashboardSettings');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('dashboard settings', () => {
    let originalTitles: string[] = [];

    const checkDashboardTitle = async (expectedTitle: string) => {
      expect(await browser.getTitle()).to.equal(`${expectedTitle} - Elastic`);
      await retry.try(async () => {
        const breadcrumb = await globalNav.getLastBreadcrumb();
        expect(breadcrumb).to.equal(`Editing ${expectedTitle}`);
      });
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      originalTitles = await PageObjects.dashboard.getPanelTitles();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should be able to hide all panel titles', async () => {
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.toggleShowPanelTitles(false);
      await dashboardSettings.clickApplyButton();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql(undefined);
      });
    });

    it('should be able to unhide all panel titles', async () => {
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.toggleShowPanelTitles(true);
      await dashboardSettings.clickApplyButton();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql(originalTitles[0]);
      });
    });

    it('should update the title of the dashboard', async () => {
      await checkDashboardTitle('few panels');

      const newTitle = 'My awesome dashboard!!1';
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.setCustomPanelTitle(newTitle);
      await dashboardSettings.clickApplyButton();

      await checkDashboardTitle(newTitle);
    });

    it('should disable quick save when the settings are open', async () => {
      await PageObjects.dashboard.expectQuickSaveButtonEnabled();
      await PageObjects.dashboard.openSettingsFlyout();
      await retry.try(async () => {
        await PageObjects.dashboard.expectQuickSaveButtonDisabled();
      });
      await dashboardSettings.clickCancelButton();
    });

    it('should enable quick save when the settings flyout is closed', async () => {
      await PageObjects.dashboard.expectQuickSaveButtonEnabled();
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.clickCloseFlyoutButton();
      await retry.try(async () => {
        await PageObjects.dashboard.expectQuickSaveButtonEnabled();
      });
    });

    it('should warn when creating a duplicate title', async () => {
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.setCustomPanelTitle('couple panels');
      await dashboardSettings.clickApplyButton(false);
      await retry.try(async () => {
        await dashboardSettings.expectDuplicateTitleWarningDisplayed();
      });
      await dashboardSettings.clickCancelButton();
    });

    it('should allow duplicate title if warned once', async () => {
      const newTitle = 'couple panels';
      await PageObjects.dashboard.openSettingsFlyout();
      await dashboardSettings.setCustomPanelTitle(newTitle);
      await dashboardSettings.clickApplyButton(false);
      await retry.try(async () => {
        await dashboardSettings.expectDuplicateTitleWarningDisplayed();
      });
      await dashboardSettings.clickApplyButton();

      await checkDashboardTitle(newTitle);
    });
  });
}
