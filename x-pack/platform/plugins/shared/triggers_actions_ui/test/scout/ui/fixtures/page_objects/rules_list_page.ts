/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { BIGGER_TIMEOUT, RULES_LIST_TEST_SUBJECTS, SHORTER_TIMEOUT } from '../constants';

export class RulesListPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('rules');
    await this.page.testSubj.waitForSelector(RULES_LIST_TEST_SUBJECTS.APP_TITLE, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  public get appTitle() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.APP_TITLE);
  }

  public get rulesList() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULES_LIST);
  }

  public get rulesTableContainer() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULES_TABLE_CONTAINER);
  }

  public get noPermissionPrompt() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.NO_PERMISSION_PROMPT);
  }

  public get ruleSearchField() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULE_SEARCH_FIELD);
  }

  public getEditableRules() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULE_ROW);
  }

  public getNonEditableRules() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULE_ROW_NON_EDITABLE);
  }

  public getRuleRowByName(ruleName: string): Locator {
    return this.getEditableRules().filter({ hasText: ruleName });
  }

  /**
   * Searches the rules list for a rule by name and clicks the row link.
   */
  async clickRuleByName(ruleName: string) {
    await this.ruleSearchField.click();
    await this.ruleSearchField.fill(ruleName);
    await this.ruleSearchField.press('Enter');
    await this.rulesList.getByRole('link', { name: ruleName }).click();
  }

  // Rule type modal
  public get createRuleButton() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.CREATE_RULE_BUTTON);
  }

  public get ruleTypeModal() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULE_TYPE_MODAL);
  }

  public get ruleTypeModalSearch() {
    return this.page.testSubj.locator(RULES_LIST_TEST_SUBJECTS.RULE_TYPE_MODAL_SEARCH);
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
}
