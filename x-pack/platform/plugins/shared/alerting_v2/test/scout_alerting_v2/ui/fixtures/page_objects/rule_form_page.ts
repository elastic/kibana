/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import type { DiscoverAppMenu } from './discover_app_menu';

const RULE_FORM_ID = 'ruleV2Form';

export class RuleFormPage {
  public readonly nameInput: Locator;
  public readonly submitButton: Locator;
  public readonly flyoutSaveButton: Locator;
  public readonly cancelButton: Locator;
  public readonly errorCallout: Locator;
  public readonly flyout: Locator;
  public readonly form: Locator;
  public readonly esqlModeButton: Locator;
  public readonly discoverQuerySubmitButton: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly discoverAppMenu: DiscoverAppMenu) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.nameInput = this.page.testSubj.locator('ruleNameInput');
    this.submitButton = this.page.testSubj.locator('ruleV2FormSubmitButton');
    this.flyoutSaveButton = this.page.testSubj.locator('ruleV2FlyoutSaveButton');
    this.cancelButton = this.page.testSubj.locator('ruleV2FormCancelButton');
    // The form-level error callout doesn't have a dedicated `data-test-subj`;
    // scope to the EUI danger callout class until one is added in source.
    this.errorCallout = this.page.locator('.euiCallOut--danger');
    // The rule flyout doesn't have a dedicated `data-test-subj`; locate it via
    // its labelled-by attribute on the flyout title.
    this.flyout = this.page.locator('[aria-labelledby="ruleV2FormFlyoutTitle"]');
    this.form = this.page.locator(`#${RULE_FORM_ID}`);
    this.esqlModeButton = this.page.testSubj.locator('select-text-based-language-btn');
    this.discoverQuerySubmitButton = this.page.testSubj.locator('querySubmitButton');
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

  async gotoDiscover() {
    await this.page.gotoApp('discover');
  }

  /**
   * Returns the breadcrumb anchor with the given text. The Kibana chrome
   * doesn't currently expose a `data-test-subj` for individual breadcrumb
   * links, so this falls back to a scoped role-based locator.
   */
  breadcrumb(text: string) {
    return this.page
      .getByRole('navigation', { name: 'Breadcrumbs' })
      .getByRole('link', { name: text });
  }

  async setRuleName(name: string) {
    await this.nameInput.fill(name);
  }

  async clearRuleName() {
    await this.nameInput.fill('');
  }

  async clickSave() {
    await this.submitButton.click();
  }

  async clickFlyoutSave() {
    await this.flyoutSaveButton.click();
  }

  async switchToEsqlMode() {
    await this.esqlModeButton.click();
  }

  /**
   * Alerts → Create ES|QL rule. Uses the shared {@link DiscoverAppMenu}
   * page object so selectors stay in sync with `discover_alerts_menu.spec.ts`.
   */
  async openRulesFlyoutFromDiscover() {
    await this.discoverAppMenu.openCreateEsqlRuleFlyout();
  }

  /** Sets the Discover ES|QL editor (model index 0) without submitting. */
  async setDiscoverQueryWithFlyoutOpen(query: string) {
    await this.codeEditor.setCodeEditorValue(query, 0);
  }

  async submitDiscoverQuery() {
    await this.discoverQuerySubmitButton.click();
  }

  /** Scroll the rule form to the bottom (used to assert error callout in viewport). */
  async scrollFormToBottom() {
    await this.form.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }
}
