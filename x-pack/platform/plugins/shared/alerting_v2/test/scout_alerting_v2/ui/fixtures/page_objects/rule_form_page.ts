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
  /**
   * The primary "proceed" button in the compose flyout opened from Discover.
   * On steps 0–N-1 this is the "Next" button; on the last step it is "Create
   * rule". The validation tests use it to check whether the user can advance
   * (ES|QL param errors disable it) or to trigger per-step validation (e.g.
   * name validation on the Details step).
   */
  public readonly flyoutSaveButton: Locator;
  public readonly cancelButton: Locator;
  /**
   * Inline field-level error shown below the rule name input when the name
   * field fails validation (empty or equals the default placeholder).
   */
  public readonly nameFieldError: Locator;
  public readonly flyout: Locator;
  public readonly flyoutValidationCallout: Locator;
  public readonly form: Locator;
  public readonly esqlModeButton: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly discoverAppMenu: DiscoverAppMenu) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.nameInput = this.page.testSubj.locator('ruleNameInput');
    this.submitButton = this.page.testSubj.locator('ruleV2FormSubmitButton');
    // In ComposeDiscoverFlyout the per-step advance button is "Next" on all
    // intermediate steps and "Create rule" on the last step. For the Discover
    // flyout tests the Next button doubles as the "proceed / save" gate.
    this.flyoutSaveButton = this.page.testSubj.locator('composeDiscoverNext');
    this.cancelButton = this.page.testSubj.locator('composeDiscoverCancel');
    // The ComposeDiscoverFlyout title ID.
    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    // Inline name validation error on the Details step (EuiFormRow invalid state).
    this.nameFieldError = this.flyout
      .locator('.euiFormRow-isInvalid')
      .getByText(/Name is required/);
    this.flyoutValidationCallout = this.page.testSubj.locator('ruleV2FlyoutValidationErrors');
    this.form = this.page.locator(`#${RULE_FORM_ID}`);
    this.esqlModeButton = this.page.testSubj.locator('select-text-based-language-btn');
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
    await this.waitForNextButtonEnabled();
    await this.flyoutSaveButton.click();
  }

  /**
   * Advances through the ComposeDiscoverFlyout steps until the Details step
   * (where the rule name input appears). Assumes the flyout is already open
   * with a pre-populated query (queryCommitted = true) so that the Next button
   * is enabled from the very first step.
   */
  async navigateToDetailsStep() {
    await this.clickNextWhenEnabled();
    await this.clickNextWhenEnabled();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  private async waitForNextButtonEnabled() {
    await this.discoverAppMenu.dismissQuerySandboxIfOpen();
    await this.flyoutSaveButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() => {
      const button = document.querySelector(
        '[data-test-subj="composeDiscoverNext"]'
      ) as HTMLButtonElement | null;
      return Boolean(button && !button.disabled);
    });
  }

  private async clickNextWhenEnabled() {
    await this.waitForNextButtonEnabled();
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

  /**
   * Submits the Discover ES|QL query while the compose flyout is open.
   * The flyout overlay intercepts pointer events on the submit button, so we
   * trigger the click programmatically instead.
   */
  async submitDiscoverQuery() {
    await this.page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('[data-test-subj="querySubmitButton"]')?.click();
    });
  }

  /** Scroll the rule form to the bottom (used to assert error callout in viewport). */
  async scrollFormToBottom() {
    await this.form.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }
}
