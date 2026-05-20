/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export class ComposeDiscoverPage {
  public readonly flyout: Locator;
  public readonly nextButton: Locator;
  public readonly backButton: Locator;
  public readonly submitButton: Locator;
  public readonly openEditorButton: Locator;
  public readonly editQueryButton: Locator;
  public readonly sandboxSearchButton: Locator;
  public readonly sandboxApplyButton: Locator;
  public readonly sandboxTimeFieldSelector: Locator;
  public readonly ruleNameInput: Locator;
  public readonly createRuleSplitButton: Locator;
  public readonly createRulePopoverButton: Locator;
  public readonly createEsqlRuleButton: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    this.nextButton = this.page.testSubj.locator('composeDiscoverNext');
    this.backButton = this.page.testSubj.locator('composeDiscoverBack');
    this.submitButton = this.page.testSubj.locator('composeDiscoverSubmit');
    this.openEditorButton = this.page.testSubj.locator('composeDiscoverOpenEditor');
    this.editQueryButton = this.page.testSubj.locator('composeDiscoverEditQuery');
    this.sandboxSearchButton = this.page.testSubj.locator('composeDiscoverRunQuery');
    this.sandboxApplyButton = this.page.testSubj.locator('querySandboxApply');
    this.sandboxTimeFieldSelector = this.page.testSubj.locator('composeDiscoverTimeField');
    this.ruleNameInput = this.flyout.locator('[data-test-subj="ruleNameInput"]');
    this.createRuleSplitButton = this.page.testSubj.locator('createRuleSplitButton');
    this.createRulePopoverButton = this.page.testSubj.locator('createRulePopoverButton');
    this.createEsqlRuleButton = this.page.testSubj.locator('createEsqlRuleButton');
  }

  editRuleButton(ruleId: string) {
    return this.page.testSubj.locator(`quickEditRule-${ruleId}`);
  }

  async openCreateFlyout() {
    await this.createRulePopoverButton.click();
    await this.createEsqlRuleButton.click();
  }

  async openEditFlyout(ruleId: string) {
    await this.editRuleButton(ruleId).click();
  }

  /**
   * Types an ES|QL query into the sandbox code editor.
   * The sandbox renders a single Monaco instance (model index 0).
   */
  async setSandboxQuery(query: string) {
    await this.codeEditor.setCodeEditorValue(query, 0);
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickApply() {
    await this.sandboxApplyButton.click();
  }

  async setRuleName(name: string) {
    await this.ruleNameInput.fill(name);
  }
}
