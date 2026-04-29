/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { BIGGER_TIMEOUT, RULES_SETTINGS_FLYOUT_TEST_SUBJECTS, SHORTER_TIMEOUT } from '../constants';

/**
 * Page object for the Rules Settings flyout (opened from the gear icon on the rules list).
 * Owns the flyout open/close lifecycle plus the flapping/look-back/status-change/query-delay controls.
 */
export class RulesSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  public get settingsLink() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.RULES_SETTINGS_LINK);
  }

  public get flyout() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT);
  }

  public get cancelButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_CANCEL_BUTTON
    );
  }

  public get saveButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_SAVE_BUTTON
    );
  }

  public get loadingSpinner() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.CENTER_SPINNER);
  }

  public get flappingOffPrompt() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.FLAPPING_OFF_PROMPT);
  }

  public get flappingEnableSwitch() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.FLAPPING_ENABLE_SWITCH);
  }

  public get lookBackWindowInput() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.LOOK_BACK_WINDOW_RANGE_INPUT
    );
  }

  public get statusChangeThresholdInput() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.STATUS_CHANGE_THRESHOLD_RANGE_INPUT
    );
  }

  public get queryDelayInput() {
    return this.page.testSubj.locator(RULES_SETTINGS_FLYOUT_TEST_SUBJECTS.QUERY_DELAY_RANGE_INPUT);
  }

  async open() {
    await expect(this.settingsLink).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.settingsLink.click();
    await expect(this.flyout).toBeVisible();
    await expect(this.loadingSpinner).toBeHidden({ timeout: BIGGER_TIMEOUT });
  }

  async cancel() {
    await this.cancelButton.click();
    await expect(this.flyout).toBeHidden();
  }

  async save() {
    await this.saveButton.click();
    await expect(this.flyout).toBeHidden({ timeout: BIGGER_TIMEOUT });
  }

  /**
   * Drags an EUI range input by repeatedly pressing arrow keys after focusing.
   */
  async dragRangeInput(input: Locator, steps: number, direction: 'left' | 'right') {
    await input.focus();
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(key);
    }
  }
}
