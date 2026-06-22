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
   * "Open query editor" — visible on the Alert Condition step when no query has
   * been committed yet (queryCommitted === false).
   */
  public readonly openEditorButton: Locator;
  /**
   * "Edit query" — visible on the Alert Condition step when a query is committed
   * in signal (non-tracking) mode.
   */
  public readonly editQueryButton: Locator;
  /**
   * "Edit queries" — visible on the Alert Condition step when a query is committed
   * in tracking (alert kind) mode, where base + breach blocks are shown separately.
   */
  public readonly editQueriesButton: Locator;
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
   * Warning callout shown when the base query is applied but the breach
   * (alert condition) segment is missing.
   */
  public readonly breachQueryMissingCallout: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);

    this.flyout = this.page.locator('[aria-labelledby="composeDiscoverFlyoutTitle"]');
    this.nextButton = this.page.testSubj.locator('composeDiscoverNext');
    this.backButton = this.page.testSubj.locator('composeDiscoverBack');
    this.submitButton = this.page.testSubj.locator('composeDiscoverSubmit');
    this.openEditorButton = this.page.testSubj.locator('composeDiscoverOpenEditor');
    this.editQueryButton = this.page.testSubj.locator('composeDiscoverEditQuery');
    this.editQueriesButton = this.page.testSubj.locator('composeDiscoverEditQueries');
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
    this.breachQueryMissingCallout = this.page.testSubj.locator('composeDiscoverAlertQueryMissing');
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

  /**
   * Types an ES|QL query into the sandbox base-tab code editor (Monaco index 0).
   */
  async setSandboxQuery(query: string) {
    await this.codeEditor.setCodeEditorValue(query, 0);
  }

  /**
   * Switches the sandbox to the "Alert condition" tab and types the given
   * segment into the alert-condition editor (Monaco index 1, because the
   * locked base preview occupies index 0 on that tab).
   */
  async setSandboxAlertCondition(segment: string) {
    await this.page.testSubj.locator('querySandboxTab-alert').click();
    await this.codeEditor.setCodeEditorValue(segment, 1);
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

  /**
   * Returns the raw YAML string from the YAML-mode Monaco editor.
   *
   * The sandbox query editors may also be mounted, so the YAML model is
   * identified by looking for the model whose content starts with "kind:".
   */
  async getYamlEditorValue(): Promise<string> {
    const yamlEditor = this.page.testSubj.locator('ruleV2FormYamlEditor');
    await expect(yamlEditor).toBeVisible({ timeout: 30_000 });

    let result = '';
    await expect(async () => {
      result = await this.page.evaluate(() => {
        const monacoEnv = (window as any).MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const models = monacoEnv.monaco.editor.getModels() as Array<{ getValue(): string }>;
        const yamlModel = models.find((m) => m.getValue().trimStart().startsWith('kind:'));
        if (!yamlModel) {
          throw new Error('YAML model not found among Monaco models');
        }
        return yamlModel.getValue();
      });
    }).toPass({ timeout: 30_000 });

    return result;
  }

  /**
   * Replaces the full content of the YAML-mode Monaco editor via executeEdits,
   * which fires all change listeners (including React's onChange prop).
   */
  async setYamlEditorValue(value: string): Promise<void> {
    const yamlEditor = this.page.testSubj.locator('ruleV2FormYamlEditor');
    await expect(yamlEditor).toBeVisible({ timeout: 30_000 });

    await this.page.evaluate((newValue) => {
      const monacoEnv = (window as any).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }

      const models = monacoEnv.monaco.editor.getModels() as Array<{
        getValue(): string;
        getFullModelRange(): any;
        uri: { toString(): string };
      }>;
      const yamlModel = models.find((m) => m.getValue().trimStart().startsWith('kind:'));
      if (!yamlModel) {
        throw new Error('YAML model not found among Monaco models');
      }

      const editors = monacoEnv.monaco.editor.getEditors() as Array<{
        getModel(): { uri: { toString(): string } } | null;
        executeEdits(source: string, edits: any[]): void;
        focus(): void;
      }>;
      const editor = editors.find(
        (e) => e.getModel()?.uri?.toString() === yamlModel.uri.toString()
      );
      if (!editor) {
        throw new Error('YAML editor instance not found');
      }

      const fullRange = yamlModel.getFullModelRange();
      editor.executeEdits('scout-test', [{ range: fullRange, text: newValue }]);
    }, value);
  }
}
