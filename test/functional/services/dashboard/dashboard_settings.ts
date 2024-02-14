/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function DashboardSettingsProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');

  return new (class DashboardSettingsPanel {
    public readonly FLYOUT_TEST_SUBJ = 'dashboardSettingsFlyout';
    public readonly SYNC_TOOLTIPS_DATA_SUBJ = 'dashboardSyncTooltipsCheckbox';

    async expectDashboardSettingsFlyoutOpen() {
      log.debug('expectDashboardSettingsFlyoutOpen');
      await testSubjects.existOrFail(this.FLYOUT_TEST_SUBJ);
    }

    async expectDashboardSettingsFlyoutClosed() {
      log.debug('expectDashboardSettingsFlyoutClosed');
      await testSubjects.missingOrFail(this.FLYOUT_TEST_SUBJ);
    }

    async expectDuplicateTitleWarningDisplayed() {
      log.debug('expectDuplicateTitleWarningDisplayed');
      await testSubjects.existOrFail('duplicateTitleWarningMessage');
    }

    async findFlyout() {
      log.debug('findFlyout');
      return await testSubjects.find(this.FLYOUT_TEST_SUBJ);
    }

    public async findFlyoutTestSubject(testSubject: string) {
      log.debug(`findFlyoutTestSubject::${testSubject}`);
      const flyout = await this.findFlyout();
      return await flyout.findByCssSelector(`[data-test-subj="${testSubject}"]`);
    }

    public async setCustomPanelTitle(customTitle: string) {
      log.debug(`setCustomPanelTitle::${customTitle}`);
      await testSubjects.setValue('dashboardTitleInput', customTitle, {
        clearWithKeyboard: customTitle === '', // if clearing the title using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async setCustomPanelDescription(customDescription: string) {
      log.debug(`setCustomPanelDescription::${customDescription}`);
      await testSubjects.setValue('dashboardDescriptionInput', customDescription, {
        clearWithKeyboard: customDescription === '', // if clearing the description using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async toggleStoreTimeWithDashboard(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleStoreTimeWithDashboard::${status}`);
      await testSubjects.setEuiSwitch('storeTimeWithDashboard', status);
    }

    public async toggleUseMarginsBetweenPanels(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleUseMarginsBetweenPanels::${status}`);
      await testSubjects.setEuiSwitch('dashboardMarginsCheckbox', status);
    }

    public async toggleShowPanelTitles(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleShowPanelTitles::${status}`);
      await testSubjects.setEuiSwitch('dashboardPanelTitlesCheckbox', status);
    }

    public async toggleSyncColors(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleSyncColors::${status}`);
      await testSubjects.setEuiSwitch('dashboardSyncColorsCheckbox', status);
    }

    public async toggleSyncCursor(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleSyncCursor::${status}`);
      await testSubjects.setEuiSwitch('dashboardSyncCursorCheckbox', status);
    }

    public async isSyncTooltipsEnabled() {
      log.debug('isSyncTooltipsEnabled');
      return await testSubjects.isEuiSwitchChecked(this.SYNC_TOOLTIPS_DATA_SUBJ);
    }

    public async toggleSyncTooltips(value: boolean) {
      const status = value ? 'check' : 'uncheck';
      log.debug(`toggleSyncTooltips::${status}`);
      if (await this.isSyncTooltipsEnabled) {
        await testSubjects.setEuiSwitch(this.SYNC_TOOLTIPS_DATA_SUBJ, status);
      }
    }

    public async isShowingDuplicateTitleWarning() {
      log.debug('isShowingDuplicateTitleWarning');
      await testSubjects.exists('duplicateTitleWarningMessage');
    }

    public async clickApplyButton(shouldClose: boolean = true) {
      log.debug('clickApplyButton');
      await retry.try(async () => {
        await toasts.dismissAll();
        await testSubjects.click('applyCustomizeDashboardButton');
        if (shouldClose) await this.expectDashboardSettingsFlyoutClosed();
      });
    }

    public async clickCancelButton() {
      log.debug('clickCancelButton');
      await retry.try(async () => {
        await toasts.dismissAll();
        await testSubjects.click('cancelCustomizeDashboardButton');
        await this.expectDashboardSettingsFlyoutClosed();
      });
    }

    public async clickCloseFlyoutButton() {
      log.debug();
      await retry.try(async () => {
        await toasts.dismissAll();
        await (await this.findFlyoutTestSubject('euiFlyoutCloseButton')).click();
        await this.expectDashboardSettingsFlyoutClosed();
      });
    }
  })();
}
