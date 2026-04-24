/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  BIGGER_TIMEOUT,
  LOGS_TAB_TEST_SUBJECTS,
  RULE_LIST_TEST_SUBJECTS,
  RULE_TYPE_MODAL_TEST_SUBJECTS,
  RULES_SETTINGS_TEST_SUBJECTS,
  SHORTER_TIMEOUT,
} from '../constants';

/**
 * Page object for the unified rules list page mounted at `/app/rules`.
 */
export class RulesPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigate to the rules list page.
   */
  async goto() {
    await this.page.gotoApp('rules');
    await this.page.testSubj.waitForSelector(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  /**
   * Navigate directly to the logs tab of the rules app.
   */
  async gotoLogsTab() {
    await this.page.gotoApp('rules/logs');
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  public get pageTitle() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_PAGE_TAB);
  }

  // ---- Rules table ---------------------------------------------------------

  public get rulesTableContainer() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_TABLE_CONTAINER);
  }

  public get rulesTable() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_TABLE);
  }

  public getNonEditableRules() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_ROW_NON_EDITABLE);
  }

  public getEditableRules() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULE_ROW);
  }

  public getRuleRowByName(ruleName: string) {
    return this.getEditableRules().filter({ hasText: ruleName });
  }

  public getRuleSidebarEditAction(ruleRow: Locator) {
    return ruleRow.locator(
      `[data-test-subj="${RULE_LIST_TEST_SUBJECTS.RULE_SIDEBAR_EDIT_ACTION}"]`
    );
  }

  public getEditActionButton(ruleRow: Locator) {
    return ruleRow.locator(
      `[data-test-subj="${RULE_LIST_TEST_SUBJECTS.EDIT_ACTION_HOVER_BUTTON}"]`
    );
  }

  public get ruleSearchField() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.RULE_SEARCH_FIELD);
  }

  public get confirmModalButton() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.CONFIRM_MODAL_BUTTON);
  }

  /**
   * Hover over a rule row and assert the edit-action elements are visible.
   * Only usable for users that have rule-edit privileges.
   */
  async expectEditActionVisible(ruleName: string) {
    const ruleRow = this.getEditableRules().filter({ hasText: ruleName });
    await ruleRow.hover();
    await expect(this.getRuleSidebarEditAction(ruleRow)).toBeVisible();
    await expect(this.getEditActionButton(ruleRow)).toBeVisible();
  }

  // ---- Rule status dropdown -----------------------------------------------

  public getRuleStatusDropdown(ruleRow: Locator) {
    return ruleRow.locator(`[data-test-subj="${RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN}"]`);
  }

  public get disableDropdownItem() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN_DISABLED_ITEM);
  }

  public get enableDropdownItem() {
    return this.page.testSubj.locator(RULE_LIST_TEST_SUBJECTS.STATUS_DROPDOWN_ENABLED_ITEM);
  }

  async clickRuleStatusDropDownMenu(ruleName: string) {
    const statusDropdown = this.getRuleStatusDropdown(this.getRuleRowByName(ruleName));
    await expect(statusDropdown).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await statusDropdown.click();
  }

  async clickDisableFromDropDownMenu() {
    await expect(this.disableDropdownItem).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.disableDropdownItem.click();
  }

  async clickEnableFromDropDownMenu() {
    await expect(this.enableDropdownItem).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.enableDropdownItem.click();
  }

  async expectRuleToBeDisabled(ruleName: string) {
    const statusDropdown = this.getRuleStatusDropdown(this.getRuleRowByName(ruleName));
    await expect(statusDropdown).toHaveAttribute('title', 'Disabled', { timeout: BIGGER_TIMEOUT });
  }

  async expectRuleToBeEnabled(ruleName: string) {
    const statusDropdown = this.getRuleStatusDropdown(this.getRuleRowByName(ruleName));
    await expect(statusDropdown).toHaveAttribute('title', 'Enabled', { timeout: BIGGER_TIMEOUT });
  }

  // ---- Rule type modal (create rule) --------------------------------------

  public get createRuleButton() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.CREATE_RULE_BUTTON);
  }

  public get ruleTypeModal() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.RULE_TYPE_MODAL);
  }

  public get ruleTypeModalSearch() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.RULE_TYPE_MODAL_SEARCH);
  }

  public get allRuleTypesButton() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.ALL_RULE_TYPES_BUTTON);
  }

  async openRuleTypeModal() {
    await expect(this.createRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.createRuleButton.click();
    await expect(this.ruleTypeModal).toBeVisible();
  }

  async closeRuleTypeModal() {
    await this.page.keyboard.press('Escape');
    await expect(this.ruleTypeModal).toBeHidden({ timeout: SHORTER_TIMEOUT });
  }

  // ---- Rules settings flyout ----------------------------------------------

  public get settingsLink() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_LINK);
  }

  public get settingsFlyout() {
    return this.page.testSubj.locator(RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT);
  }

  public get settingsFlyoutCancelButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_CANCEL_BUTTON
    );
  }

  public get settingsFlyoutSaveButton() {
    return this.page.testSubj.locator(
      RULES_SETTINGS_TEST_SUBJECTS.RULES_SETTINGS_FLYOUT_SAVE_BUTTON
    );
  }

  async openSettingsFlyout() {
    await expect(this.settingsLink).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.settingsLink.click();
    await expect(this.settingsFlyout).toBeVisible();
  }

  async expectSettingsFlyoutVisible() {
    await expect(this.settingsFlyout).toBeVisible();
    await expect(this.settingsFlyoutCancelButton).toBeVisible();
    await expect(this.settingsFlyoutSaveButton).toBeVisible();
  }

  async closeSettingsFlyout() {
    await this.settingsFlyoutCancelButton.click();
    await expect(this.settingsFlyout).toBeHidden();
  }

  // ---- Logs tab ------------------------------------------------------------

  public get logsTab() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.LOGS_TAB);
  }

  public get eventLogTable() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE);
  }

  public get ruleDetails() {
    return this.page.testSubj.locator(LOGS_TAB_TEST_SUBJECTS.RULE_DETAILS);
  }

  async clickLogsTab() {
    await expect(this.logsTab).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.logsTab.click();
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.EVENT_LOG_TABLE, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  async expectLogsTabActive() {
    await expect(this.logsTab).toHaveAttribute('aria-selected', 'true');
  }

  async waitForLogsTableToLoad() {
    const loadingIndicators = await this.eventLogTable
      .getByRole('progressbar', { name: 'Loading' })
      .all();
    for (const indicator of loadingIndicators) {
      await expect(indicator).toBeHidden({ timeout: BIGGER_TIMEOUT });
    }
  }

  async getLogsTableRuleLinks(ruleName: string) {
    return this.eventLogTable.getByRole('button', { name: ruleName }).all();
  }

  async clickOnRuleInEventLogs(ruleLog: Locator) {
    await ruleLog.click();
    await this.page.testSubj.waitForSelector(LOGS_TAB_TEST_SUBJECTS.RULE_DETAILS, {
      timeout: BIGGER_TIMEOUT,
    });
  }
}
