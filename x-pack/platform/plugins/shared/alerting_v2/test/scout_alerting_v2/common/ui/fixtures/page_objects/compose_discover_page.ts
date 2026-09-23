/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectObject, Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

// Importing @kbn/alerting-v2-rule-form transitively pulls in monaco-editor CSS,
// which Playwright's test-listing phase cannot handle (see compose_discover_flyout.spec.ts).
// Mirror its `QueryTab` / `RecoveryStrategy` value unions here instead.
// Source: x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/flyout/compose_discover/types.ts
type QueryTab = 'base' | 'alert' | 'recovery';
type RecoveryStrategyValue = 'no_breach' | 'query' | 'none';

export class ComposeDiscoverPage {
  public readonly flyout: Locator;
  public readonly nextButton: Locator;
  public readonly backButton: Locator;
  public readonly submitButton: Locator;
  /** YAML-mode save button (non-representable rules — every alert + standalone). */
  public readonly yamlSubmitButton: Locator;
  /**
   * @deprecated Use {@link alertSummaryEditorButton}. Both alert and signal now
   * share `esqlSummaryOpenEditor` on the Alert Condition step.
   */
  public readonly openEditorButton: Locator;
  /**
   * @deprecated Use {@link alertSummaryEditorButton}. Both alert and signal now
   * share `esqlSummaryOpenEditor` on the Alert Condition step.
   */
  public readonly editQueryButton: Locator;
  /**
   * Edit CTA in the query summary on the Alert Condition step. Labeled
   * "Add query" before a query is applied and "Edit query" afterwards; both
   * kinds share this subject. Create uses a single unified editor and the heuristic
   * split runs on Apply (alert only).
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
  /** Tags combobox on the Details step. */
  public readonly tagsInput: Locator;
  public readonly addRunbookButton: Locator;
  public readonly relatedDashboardsSelector: Locator;
  public readonly relatedDashboardsInput: Locator;
  public readonly createRuleSplitDropdownButton: Locator;
  public readonly createEsqlRuleButton: Locator;
  /** "Create ES|QL rule" card in the empty-state panel (shown when no rules exist). */
  public readonly createEsqlRuleCard: Locator;
  /** Kind radio-card group on the Outcome step. */
  public readonly kindSelect: Locator;
  /**
   * Callout shown after Apply when the query has a base but no alert condition
   * (no WHERE) — the whole query is treated as the breach query (every row breaches).
   */
  public readonly noAlertConditionCallout: Locator;
  /** Callout shown after Apply when the query is empty. */
  public readonly emptyQueryCallout: Locator;
  public readonly confirmBuilderToEsqlModal: Locator;
  public readonly switchToEsqlToggle: Locator;
  /** "YAML MODE" badge shown in the flyout header while in YAML view. */
  public readonly yamlBadge: Locator;
  /** Form/YAML view toggle in the flyout header. */
  public readonly editModeToggle: Locator;
  /** "Edit recovery query" CTA on the Outcome step's Custom recovery summary. */
  public readonly editRecoveryButton: Locator;
  /** Recovery-strategy dropdown on the Outcome step. */
  public readonly recoveryTypeSelect: EuiSuperSelectObject;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    this.nextButton = this.page.testSubj.locator('composeDiscoverNext');
    this.backButton = this.page.testSubj.locator('composeDiscoverBack');
    this.submitButton = this.page.testSubj.locator('composeDiscoverSubmit');
    this.yamlSubmitButton = this.page.testSubj.locator('composeDiscoverYamlSubmit');
    this.alertSummaryEditorButton = this.page.testSubj.locator('esqlSummaryOpenEditor');
    this.openEditorButton = this.alertSummaryEditorButton;
    this.editQueryButton = this.alertSummaryEditorButton;
    this.sandboxCloseButton = this.page.testSubj.locator('querySandboxClose');
    this.sandboxSearchButton = this.page.testSubj.locator('composeDiscoverRunQuery');
    this.sandboxApplyButton = this.page.testSubj.locator('querySandboxApply');
    this.timeFieldSelector = this.page.testSubj.locator('composeDiscoverTimeField');
    this.timeFieldError = this.page.testSubj.locator('composeDiscoverTimeFieldError');
    this.sandboxTimeFieldSelector = this.page.testSubj.locator('querySandboxTimeField');
    this.ruleNameInput = this.flyout.locator('[data-test-subj="ruleNameInput"]');
    this.tagsInput = this.flyout.locator('[data-test-subj="ruleTagsInput"]');
    this.addRunbookButton = this.flyout.locator('[data-test-subj="addRunbookButton"]');
    this.relatedDashboardsSelector = this.flyout.locator('[data-test-subj="dashboardsSelector"]');
    this.relatedDashboardsInput = this.flyout.locator(
      'input[placeholder="Link related dashboards for investigation"]'
    );
    this.kindSelect = this.page.testSubj.locator('composeDiscoverKindSelect');
    this.createRuleSplitDropdownButton = this.page.testSubj.locator(
      'createRuleButton-secondary-button'
    );
    this.createEsqlRuleButton = this.page.testSubj.locator('createEsqlRuleButton');
    this.createEsqlRuleCard = this.page.testSubj.locator('createEsqlRuleCard');
    this.noAlertConditionCallout = this.page.testSubj.locator('esqlSummaryNoAlertConditionCallout');
    this.emptyQueryCallout = this.page.testSubj.locator('esqlSummaryEmptyCallout');
    this.confirmBuilderToEsqlModal = this.page.testSubj.locator(
      'alertingV2ConfirmBuilderToEsqlModal'
    );
    this.switchToEsqlToggle = this.page.testSubj.locator('composeDiscoverSwitchToEsql');
    this.yamlBadge = this.page.testSubj.locator('composeDiscoverYamlBadge');
    this.editModeToggle = this.page.testSubj.locator('composeDiscoverEditModeToggle');
    this.editRecoveryButton = this.page.testSubj.locator('composeDiscoverEditRecovery');
    this.recoveryTypeSelect = this.page.components.superSelect('composeDiscoverRecoveryType');
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

  async clickSwitchToEsql() {
    await this.switchToEsqlToggle.locator('[data-test-subj="esql"]').click();
  }

  async confirmBuilderToEsql() {
    await this.confirmBuilderToEsqlModal
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();
  }

  /**
   * Opens the query sandbox from the Alert Condition step (alert kind).
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

  /** Reads the YAML editor buffer (the only Monaco model in YAML-only mode). */
  async getYamlEditorValue(): Promise<string> {
    return this.codeEditor.getCodeEditorValue(0);
  }

  /** Replaces the YAML editor buffer. */
  async setYamlEditorValue(value: string): Promise<string> {
    return this.codeEditor.setCodeEditorValue(value, 0);
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

  /** Removes every selected tag via the combobox clear button. */
  async clearAllTags() {
    await this.tagsInput.locator('[data-test-subj="comboBoxClearButton"]').click();
  }

  /**
   * Switches Alert / Signal kind on the Outcome step. The sandbox must be closed
   * first — KindSelect is disabled while the query sandbox is open.
   */
  async selectKind(kind: 'alert' | 'signal') {
    await this.page.testSubj.locator(`composeDiscoverKindSelect-${kind}`).click();
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

  /** Toggles the flyout between Form view and YAML view. */
  async toggleEditMode(mode: 'yaml' | 'form') {
    await this.editModeToggle.locator(`[data-test-subj="${mode}"]`).click();
  }

  /** Returns the sandbox tab button for the given tab id. */
  sandboxTab(tab: QueryTab): Locator {
    return this.page.testSubj.locator(`querySandboxTab-${tab}`);
  }

  async selectSandboxTab(tab: QueryTab) {
    await this.sandboxTab(tab).click();
  }

  /** Reads the full text of the "Rule definition" YAML editor. */
  async getYamlText(): Promise<string> {
    return this.codeEditor.getCodeEditorValueByTestSubj('ruleV2FormYamlEditor');
  }

  /** Overwrites the full text of the "Rule definition" YAML editor. */
  async setYamlText(yaml: string): Promise<void> {
    await this.codeEditor.setCodeEditorValueByTestSubj('ruleV2FormYamlEditor', yaml);
  }

  /** Types an ES|QL query into the sandbox's recovery block editor. */
  async setRecoveryBlockQuery(segment: string) {
    await this.codeEditor.setCodeEditorValueByTestSubj(
      'composeDiscoverBlockEditor-recovery',
      segment
    );
  }

  /** Selects a recovery-strategy dropdown option by its API value. */
  async selectRecoveryType(strategy: RecoveryStrategyValue) {
    await this.recoveryTypeSelect.selectOptionByValue(strategy);
  }

  /** Reads the recovery-strategy dropdown's committed value. */
  async getSelectedRecoveryType(): Promise<string> {
    return this.recoveryTypeSelect.getSelectedValue();
  }
}
