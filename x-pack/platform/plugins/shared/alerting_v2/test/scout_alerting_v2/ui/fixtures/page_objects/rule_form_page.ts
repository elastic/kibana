/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import type { DiscoverAppMenu } from './discover_app_menu';

export class RuleFormPage {
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly discoverAppMenu: DiscoverAppMenu) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async gotoCreate() {
    await this.page.gotoApp('management/alertingV2/rules/create');
  }

  async gotoRulesList() {
    await this.page.gotoApp('management/alertingV2/rules');
  }

  async gotoRuleDetails(ruleId: string) {
    await this.page.gotoApp(`management/alertingV2/rules/${ruleId}`);
  }

  breadcrumb(text: string) {
    return this.page.locator(`nav.euiBreadcrumbs a:has-text("${text}")`);
  }

  async gotoDiscover() {
    await this.page.gotoApp('discover');
  }

  createRuleButton() {
    return this.page.testSubj.locator('createRuleButton');
  }

  nameInput() {
    return this.page.testSubj.locator('ruleNameInput');
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

  async setRuleName(name: string) {
    await this.nameInput().fill(name);
  }

  async clearRuleName() {
    await this.nameInput().fill('');
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

  /**
   * Alerts → Create ES|QL rule (v2). Uses the shared {@link DiscoverAppMenu} page object so selectors
   * stay in sync with `discover_alerts_menu.spec.ts`.
   */
  async openRulesFlyoutFromDiscover() {
    await this.discoverAppMenu.openCreateEsqlRuleV2Flyout();
  }

  flyout() {
    return this.page.locator('[aria-labelledby="ruleV2FormFlyoutTitle"]');
  }

  /**
   * Sets the Discover ES|QL editor (model index 0) without overwriting
   * the flyout's editor or submitting.
   */
  async setDiscoverQueryWithFlyoutOpen(query: string) {
    await this.codeEditor.setCodeEditorValue(query, 0);
  }

  async submitDiscoverQuery() {
    await this.page.testSubj.click('querySubmitButton');
  }
}
