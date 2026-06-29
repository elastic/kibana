/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class ComposeDiscoverPage {
  public readonly flyout: Locator;
  public readonly nextButton: Locator;
  public readonly backButton: Locator;
  public readonly submitButton: Locator;
  /**
   * "Open query editor" — visible on the Alert Condition step in signal
   * (non-alert) mode when no query has been committed yet.
   */
  public readonly openEditorButton: Locator;
  /**
   * "Edit query" — visible on the Alert Condition step when a query is committed
   * in signal (non-alert) mode.
   */
  public readonly editQueryButton: Locator;
  /**
   * Edit CTA in the alert-mode query summary on the Alert Condition step. Labeled
   * "Open query editor" before a query is applied and "Edit query" afterwards; both
   * render the same test subject. Replaces the legacy base/alert "Edit queries" button —
   * create now uses a single unified editor and the heuristic split runs on Apply.
   */
  public readonly alertSummaryEditorButton: Locator;
  public readonly sandboxCloseButton: Locator;
  public readonly sandboxSearchButton: Locator;
  public readonly sandboxApplyButton: Locator;
  public readonly sandboxTimeFieldSelector: Locator;
  public readonly ruleNameInput: Locator;
  public readonly addRunbookButton: Locator;
  public readonly relatedDashboardsSelector: Locator;
  public readonly relatedDashboardsInput: Locator;
  public readonly createRulePopoverButton: Locator;
  public readonly createEsqlRuleButton: Locator;
  /** "Create ES|QL rule" card in the empty-state panel (shown when no rules exist). */
  public readonly createEsqlRuleCard: Locator;
  public readonly cancelButton: Locator;
  /**
   * Callout shown after Apply when the query has a base but no alert condition
   * (no WHERE) — the whole query is treated as the breach query (every row breaches).
   */
  public readonly noAlertConditionCallout: Locator;
  /** Callout shown after Apply when the query is empty. */
  public readonly emptyQueryCallout: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    this.nextButton = this.page.testSubj.locator('composeDiscoverNext');
    this.backButton = this.page.testSubj.locator('composeDiscoverBack');
    this.submitButton = this.page.testSubj.locator('composeDiscoverSubmit');
    this.openEditorButton = this.page.testSubj.locator('composeDiscoverOpenEditor');
    this.editQueryButton = this.page.testSubj.locator('composeDiscoverEditQuery');
    this.alertSummaryEditorButton = this.page.testSubj.locator('esqlSummaryOpenEditor');
    this.sandboxCloseButton = this.page.testSubj.locator('querySandboxClose');
    this.sandboxSearchButton = this.page.testSubj.locator('composeDiscoverRunQuery');
    this.sandboxApplyButton = this.page.testSubj.locator('querySandboxApply');
    this.sandboxTimeFieldSelector = this.page.testSubj.locator('composeDiscoverTimeField');
    this.ruleNameInput = this.flyout.locator('[data-test-subj="ruleNameInput"]');
    this.addRunbookButton = this.flyout.locator('[data-test-subj="addRunbookButton"]');
    this.relatedDashboardsSelector = this.flyout.locator('[data-test-subj="dashboardsSelector"]');
    this.relatedDashboardsInput = this.flyout.locator(
      'input[placeholder="Link related dashboards for investigation"]'
    );
    this.createRulePopoverButton = this.page.testSubj.locator('createRulePopoverButton');
    this.createEsqlRuleButton = this.page.testSubj.locator('createEsqlRuleButton');
    this.createEsqlRuleCard = this.page.testSubj.locator('createEsqlRuleCard');
    this.cancelButton = this.page.testSubj.locator('composeDiscoverCancel');
    this.noAlertConditionCallout = this.page.testSubj.locator('esqlSummaryNoAlertConditionCallout');
    this.emptyQueryCallout = this.page.testSubj.locator('esqlSummaryEmptyCallout');
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
    // Wait until either entry point is rendered — popover button (table state)
    // or empty-state card — before deciding which path to take.
    await this.createRulePopoverButton.or(this.createEsqlRuleCard).waitFor({ state: 'visible' });
    if (await this.createRulePopoverButton.isVisible()) {
      await this.createRulePopoverButton.click();
      await this.createEsqlRuleButton.click();
    } else {
      await this.createEsqlRuleCard.click();
    }
  }

  async openEditFlyout(ruleId: string) {
    await this.editRuleButton(ruleId).click();
  }

  /** Container for the editable alert-condition block editor inside the sandbox. */
  public get alertQueryEditor(): Locator {
    return this.page.testSubj.locator('composeDiscoverAlertQueryEditor');
  }

  /** Opens the sandbox from the alert-condition summary (edit / "Open query editor"). */
  async openSandboxEditor() {
    await this.alertSummaryEditorButton.click();
  }

  async switchSandboxTab(tab: 'base' | 'alert' | 'recovery') {
    await this.page.testSubj.locator(`querySandboxTab-${tab}`).click();
  }

  /**
   * Sets the alert block editor content to `fragment` and programmatically triggers
   * Monaco autocomplete on that editor. The editor is located by its `data-test-subj`
   * (not by model index) so it stays correct regardless of how many Monaco models exist.
   */
  async setAlertQueryAndTriggerSuggest(fragment: string) {
    await this.alertQueryEditor.locator('textarea').click();
    await this.page.evaluate((text) => {
      const monacoEnv = (window as unknown as { MonacoEnvironment?: any }).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const container = document.querySelector(
        '[data-test-subj="composeDiscoverAlertQueryEditor"]'
      );
      if (!container) {
        throw new Error('Alert query editor container not found');
      }
      const editor = (monacoEnv.monaco.editor.getEditors() as any[]).find(
        (e) =>
          typeof e.getDomNode === 'function' && e.getDomNode() && container.contains(e.getDomNode())
      );
      if (!editor) {
        throw new Error('Alert query editor instance not found');
      }
      const model = editor.getModel();
      model.setValue(text);
      editor.setPosition(model.getPositionAt(text.length));
      editor.focus();
      editor.trigger('scout-test', 'editor.action.triggerSuggest', {});
    }, fragment);
  }

  /** Visible labels in the Monaco autocomplete suggestion popover. */
  async getVisibleSuggestionLabels(): Promise<string[]> {
    const widget = this.codeEditor.getCodeEditorSuggestWidget();
    await widget.waitFor({ state: 'visible' });
    await expect(widget.locator('.monaco-list-row')).not.toHaveCount(0);
    return widget.locator('.monaco-list-row .label-name').allInnerTexts();
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

  async addRunbook(text: string) {
    await this.addRunbookButton.click();

    const runbookModal = this.page.getByRole('dialog', { name: 'Add Runbook' });
    await runbookModal.getByLabel('Runbook').fill(text);
    await runbookModal.getByRole('button', { name: 'Add Runbook' }).click();
  }
}
