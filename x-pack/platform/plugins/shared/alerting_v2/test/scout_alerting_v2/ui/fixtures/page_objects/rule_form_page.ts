/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class RuleFormPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoCreate() {
    await this.page.gotoApp('management/insightsAndAlerting/alerting_v2/create');
  }

  async gotoRulesList() {
    await this.page.gotoApp('management/insightsAndAlerting/alerting_v2');
  }

  async gotoDiscover() {
    await this.page.gotoApp('discover');
  }

  createRuleButton() {
    return this.page.testSubj.locator('createRuleButton');
  }

  nameInlineEdit() {
    return this.page.testSubj.locator('ruleNameInlineEdit');
  }

  nameReadModeButton() {
    return this.page.testSubj.locator('euiInlineReadModeButton');
  }

  submitButton() {
    return this.page.testSubj.locator('ruleV2FormSubmitButton');
  }

  flyoutSaveButton() {
    return this.page.testSubj.locator('ruleV2FlyoutSaveButton');
  }

  cancelButton() {
    return this.page.testSubj.locator('ruleV2FormCancelButton');
  }

  errorCallout() {
    return this.page.locator('.euiCallOut--danger');
  }

  async activateNameEditMode() {
    await this.nameReadModeButton().click();
  }

  async setRuleName(name: string) {
    await this.activateNameEditMode();
    const input = this.page.getByLabel('Edit rule name');
    await input.fill(name);
    await input.press('Enter');
  }

  async clearRuleName() {
    await this.activateNameEditMode();
    const input = this.page.getByLabel('Edit rule name');
    await input.fill('');
    await input.press('Enter');
  }

  async clickSave() {
    await this.submitButton().click();
  }

  async clickFlyoutSave() {
    await this.flyoutSaveButton().click();
  }

  async switchToEsqlMode() {
    await this.page.testSubj.locator('select-text-based-language-btn').click();
  }

  async openRulesFlyoutFromDiscover() {
    await this.page.testSubj.locator('discoverRulesMenuButton').click();
    await this.page.testSubj.locator('discoverCreateRuleButton').click();
  }
}
