/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../../x-pack/test/functional/ftr_provider_context';
import { CommonlyUsed } from '../../page_objects/time_picker';

export function DashboardCustomizePanelProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  return new (class DashboardCustomizePanel {
    public readonly FLYOUT_TEST_SUBJ = 'customizePanel';
    public readonly CUSTOM_TIME_RANGE_ACTION = 'CUSTOM_TIME_RANGE';

    async expectCustomizePanelSettingsFlyoutOpen() {
      log.debug('expectCustomizePanelSettingsFlyoutOpen');
      await testSubjects.existOrFail(this.FLYOUT_TEST_SUBJ);
    }

    async expectCustomizePanelSettingsFlyoutClosed() {
      log.debug('expectCustomizePanelSettingsFlyoutClosed');
      await testSubjects.missingOrFail(this.FLYOUT_TEST_SUBJ);
    }

    public async findFlyout() {
      log.debug('findFlyout');
      return await testSubjects.find(this.FLYOUT_TEST_SUBJ);
    }

    public async findFlyoutTestSubject(testSubject: string) {
      log.debug('findFlyoutTestSubject');
      const flyout = await this.findFlyout();
      return await flyout.findByCssSelector(`[data-test-subj="${testSubject}"]`);
    }

    public async findToggleQuickMenuButton() {
      log.debug('findToggleQuickMenuButton');
      return await this.findFlyoutTestSubject('superDatePickerToggleQuickMenuButton');
    }

    public async clickToggleQuickMenuButton() {
      log.debug('clickToggleQuickMenuButton');
      const button = await this.findToggleQuickMenuButton();
      await button.click();
    }

    public async clickCommonlyUsedTimeRange(time: CommonlyUsed) {
      log.debug('clickCommonlyUsedTimeRange', time);
      await testSubjects.click(`superDatePickerCommonlyUsed_${time}`);
    }

    public async clickToggleHidePanelTitle() {
      log.debug('clickToggleHidePanelTitle');
      await testSubjects.click('customEmbeddablePanelHideTitleSwitch');
    }

    public async setCustomPanelTitle(customTitle: string) {
      log.debug('setCustomPanelTitle');
      await testSubjects.setValue('customEmbeddablePanelTitleInput', customTitle, {
        clearWithKeyboard: customTitle === '', // if clearing the title using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async resetCustomPanelTitle() {
      log.debug('resetCustomPanelTitle');
      await testSubjects.click('resetCustomEmbeddablePanelTitleButton');
    }

    public async setCustomPanelDescription(customDescription: string) {
      log.debug('setCustomPanelDescription');
      await testSubjects.setValue('customEmbeddablePanelDescriptionInput', customDescription, {
        clearWithKeyboard: customDescription === '', // if clearing the description using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async resetCustomPanelDescription() {
      log.debug('resetCustomPanelDescription');
      await testSubjects.click('resetCustomEmbeddablePanelDescriptionButton');
    }

    public async clickFlyoutPrimaryButton() {
      log.debug('clickFlyoutPrimaryButton');
      await testSubjects.click('saveCustomizePanelButton');
    }

    // public async clickRemovePerPanelTimeRangeButton() {
    //   log.debug('clickRemovePerPanelTimeRangeButton');
    //   const button = await this.findFlyoutTestSubject('removePerPanelTimeRangeButton');
    //   await button.click();
    // }
  })();
}
