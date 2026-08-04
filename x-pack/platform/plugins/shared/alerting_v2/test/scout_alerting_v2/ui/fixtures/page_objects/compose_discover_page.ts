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
  /** YAML-mode save button (non-representable rules such as alert + standalone). */
  public readonly yamlSubmitButton: Locator;
  /**
   * Edit CTA in the query summary on the Alert Condition step. Labeled
   * "Open query editor" before a query is applied and "Edit query" afterwards; both
   * render the same test subject for alert and signal modes.
   */
  public readonly alertSummaryEditorButton: Locator;
  public readonly sandboxCloseButton: Locator;
  public readonly sandboxSearchButton: Locator;
  public readonly sandboxApplyButton: Locator;
  /** Time field selector on the Alert Condition step; `aria-invalid` when unresolved. */
  public readonly timeFieldSelector: Locator;
  /** Inline error rendered under the time field when no date field resolves. */
  public readonly timeFieldError: Locator;
  /** Time field selector inside the query sandbox flyout. */
  public readonly sandboxTimeFieldSelector: Locator;
  public readonly ruleNameInput: Locator;
  public readonly addRunbookButton: Locator;
  public readonly relatedDashboardsSelector: Locator;
  public readonly relatedDashboardsInput: Locator;
  public readonly createRuleSplitDropdownButton: Locator;
  public readonly createEsqlRuleButton: Locator;
  /** "Create ES|QL rule" card in the empty-state panel (shown when no rules exist). */
  public readonly createEsqlRuleCard: Locator;
  public readonly modeSelect: Locator;
  /**
   * Callout shown after Apply when the query has a base but no alert condition
   * (no WHERE) — informational for both alert and signal modes.
   */
  public readonly noAlertConditionCallout: Locator;
  /** Callout shown after Apply when the query is empty. */
  public readonly emptyQueryCallout: Locator;
  /** Confirmation modal when switching to Signal with a split (composed) query. */
  public readonly signalMergeModal: Locator;
  public readonly signalMergeConfirmButton: Locator;
  public readonly signalMergeCancelButton: Locator;
  public readonly sandboxSettingsButton: Locator;
  public readonly splitBaseAndAlertButton: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    this.nextButton = this.page.testSubj.locator('composeDiscoverNext');
    this.backButton = this.page.testSubj.locator('composeDiscoverBack');
    this.submitButton = this.page.testSubj.locator('composeDiscoverSubmit');
    this.yamlSubmitButton = this.page.testSubj.locator('composeDiscoverYamlSubmit');
    this.alertSummaryEditorButton = this.page.testSubj.locator('esqlSummaryOpenEditor');
    this.sandboxCloseButton = this.page.testSubj.locator('querySandboxClose');
    this.sandboxSearchButton = this.page.testSubj.locator('composeDiscoverRunQuery');
    this.sandboxApplyButton = this.page.testSubj.locator('querySandboxApply');
    this.timeFieldSelector = this.page.testSubj.locator('composeDiscoverTimeField');
    this.timeFieldError = this.page.testSubj.locator('composeDiscoverTimeFieldError');
    this.sandboxTimeFieldSelector = this.page.testSubj.locator('querySandboxTimeField');
    this.ruleNameInput = this.flyout.locator('[data-test-subj="ruleNameInput"]');
    this.addRunbookButton = this.flyout.locator('[data-test-subj="addRunbookButton"]');
    this.relatedDashboardsSelector = this.flyout.locator('[data-test-subj="dashboardsSelector"]');
    this.relatedDashboardsInput = this.flyout.locator(
      'input[placeholder="Link related dashboards for investigation"]'
    );
    this.modeSelect = this.page.testSubj.locator('composeDiscoverModeSelect');
    this.createRuleSplitDropdownButton = this.page.testSubj.locator(
      'createRuleButton-secondary-button'
    );
    this.createEsqlRuleButton = this.page.testSubj.locator('createEsqlRuleButton');
    this.createEsqlRuleCard = this.page.testSubj.locator('createEsqlRuleCard');
    this.noAlertConditionCallout = this.page.testSubj.locator('esqlSummaryNoAlertConditionCallout');
    this.emptyQueryCallout = this.page.testSubj.locator('esqlSummaryEmptyCallout');
    this.signalMergeModal = this.page.testSubj.locator('alertingV2ConfirmSignalMergeModal');
    this.signalMergeConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.signalMergeCancelButton = this.page.testSubj.locator('confirmModalCancelButton');
    this.sandboxSettingsButton = this.page.testSubj.locator('querySandboxSettingsButton');
    this.splitBaseAndAlertButton = this.page.testSubj.locator('querySandboxSplitBaseAndAlert');
  }

  /**
   * Locates the read-only query summary section for a given state. The section
   * renders `esqlQuerySummarySection-{state}` on the Alert Condition step.
   */
  summarySection(
    state: 'before_apply' | 'success' | 'no_alert_condition' | 'split_failed' | 'empty'
  ) {
    return this.page.testSubj.locator(`esqlQuerySummarySection-${state}`);
  }

  modeOption(kind: 'alert' | 'signal') {
    return this.page.testSubj.locator(`composeDiscoverModeSelect-${kind}`);
  }

  editRuleButton(ruleId: string) {
    return this.page.testSubj.locator(`quickEditRule-${ruleId}`);
  }

  async openCreateFlyout() {
    // Wait until either entry point is rendered — split dropdown (table state)
    // or empty-state card — before deciding which path to take. After a prior
    // test navigates away, Kibana can still be on the splash screen when
    // beforeEach's rulesListLoading check already passed, so allow a long wait.
    await this.createRuleSplitDropdownButton
      .or(this.createEsqlRuleCard)
      .waitFor({ state: 'visible', timeout: 60_000 });
    if (await this.createRuleSplitDropdownButton.isVisible()) {
      await this.createRuleSplitDropdownButton.click();
      await this.createEsqlRuleButton.click();
    } else {
      await this.createEsqlRuleCard.click();
    }
  }

  async openEditFlyout(ruleId: string) {
    await this.editRuleButton(ruleId).click();
  }

  /**
   * Opens the query sandbox from the Alert Condition step.
   */
  async openSandbox() {
    await this.alertSummaryEditorButton.click();
    await this.sandboxApplyButton.waitFor({ state: 'visible' });
  }

  /**
   * Types an ES|QL query into the sandbox's single unified code editor (Monaco
   * index 0). In the create flow the editor holds the whole pipeline (base +
   * alert condition); the heuristic split runs on Apply.
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

  async clickYamlSubmit() {
    await this.yamlSubmitButton.click();
  }

  async clickApply() {
    await this.sandboxApplyButton.click();
  }

  async applySandboxBaseQueryOnly(query: string) {
    await this.setSandboxQuery(query);
    await this.clickApply();
  }

  async setRuleName(name: string) {
    await this.ruleNameInput.fill(name);
  }

  /**
   * Switches Alert / Signal mode via the radio-style checkable cards. The sandbox
   * must be closed first — ModeSelect is disabled while the query sandbox is open.
   * When switching to signal with a composed query, call
   * {@link confirmSignalMerge} or {@link cancelSignalMerge} afterwards.
   */
  async selectMode(kind: 'alert' | 'signal') {
    await this.modeOption(kind).getByRole('radio').click();
  }

  async confirmSignalMerge() {
    await this.signalMergeModal.waitFor({ state: 'visible' });
    await this.signalMergeConfirmButton.click();
    await this.signalMergeModal.waitFor({ state: 'hidden' });
  }

  async cancelSignalMerge() {
    await this.signalMergeModal.waitFor({ state: 'visible' });
    await this.signalMergeCancelButton.click();
    await this.signalMergeModal.waitFor({ state: 'hidden' });
  }

  /** Opt into manual base / filtering-condition tabs from the sandbox settings menu. */
  async enableManualSplit() {
    await this.sandboxSettingsButton.click();
    await this.splitBaseAndAlertButton.click();
  }

  /** Waits until a time-field `<select>` option is present (field-caps resolution). */
  async waitForTimeFieldOption(selector: Locator, value: string) {
    await selector.locator(`option[value="${value}"]`).waitFor({ state: 'attached' });
  }

  /** Selects a value in the Alert Condition step Time field `<select>`. */
  async selectTimeField(value: string) {
    await this.waitForTimeFieldOption(this.timeFieldSelector, value);
    await this.timeFieldSelector.selectOption(value);
  }

  /** Selects a value in the query sandbox Time field `<select>`. */
  async selectSandboxTimeField(value: string) {
    await this.waitForTimeFieldOption(this.sandboxTimeFieldSelector, value);
    await this.sandboxTimeFieldSelector.selectOption(value);
  }

  async addRunbook(text: string) {
    await this.addRunbookButton.click();

    const runbookModal = this.page.getByRole('dialog', { name: 'Add Runbook' });
    await runbookModal.getByLabel('Runbook').fill(text);
    await runbookModal.getByRole('button', { name: 'Add Runbook' }).click();
  }
}
