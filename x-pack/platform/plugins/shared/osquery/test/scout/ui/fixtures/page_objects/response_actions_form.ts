/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ResponseActionsFormPage {
  readonly actionsTab: Locator;
  readonly responseActionsForm: Locator;
  readonly editRuleLink: Locator;
  readonly submitButton: Locator;
  readonly addOsqueryButton: Locator;
  readonly errorsContainer: Locator;

  constructor(private readonly page: ScoutPage) {
    this.actionsTab = this.page.testSubj.locator('edit-rule-actions-tab');
    this.responseActionsForm = this.page.testSubj.locator('response-actions-form');
    this.editRuleLink = this.page.testSubj.locator('editRuleSettingsLink');
    this.submitButton = this.page.testSubj.locator('ruleEditSubmitButton');
    this.addOsqueryButton = this.page.testSubj.locator(
      'Osquery-response-action-type-selection-option'
    );
    this.errorsContainer = this.page.testSubj.locator('response-actions-error');
  }

  getResponseActionItem(index: number): Locator {
    return this.page.testSubj.locator(`response-actions-list-item-${index}`);
  }

  async gotoRuleEdit(ruleId: string) {
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await this.actionsTab.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickActionsTab() {
    await this.actionsTab.click();
    await this.responseActionsForm.waitFor({ state: 'visible', timeout: 15000 });
  }

  async addOsqueryAction(expectedIndex: number) {
    await this.addOsqueryButton.click();
    const item = this.getResponseActionItem(expectedIndex);
    await item.waitFor({ state: 'visible', timeout: 10000 });
    await item
      .locator('[data-test-subj="kibanaCodeEditor"] .monaco-editor')
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Sets the value of the Monaco code editor inside the given action item
   * using the global Monaco API (same approach as the painless_lab Scout test).
   * This is cross-platform and avoids keyboard/focus timing issues.
   */
  private async setEditorValue(actionIndex: number, value: string) {
    const editor = this.getResponseActionItem(actionIndex).locator(
      '[data-test-subj="kibanaCodeEditor"]'
    );
    await editor.evaluate((editorEl, val) => {
      const monacoApi = (window as any).MonacoEnvironment?.monaco?.editor;
      if (!monacoApi) throw new Error('Monaco editor API not available');
      const instance = monacoApi.getEditors().find((e: any) => editorEl.contains(e.getDomNode()));
      if (!instance) throw new Error('Could not find Monaco editor instance in action item');
      instance.setValue(val);
    }, value);
  }

  /**
   * The Osquery form uses react-hook-form with mode:'all' and useDebounce(500ms).
   * Validation only fires after an onChange. Setting value to non-empty then empty
   * triggers onChange('') after the debounce, surfacing the required-field error.
   */
  async triggerQueryValidation(actionIndex: number) {
    await this.setEditorValue(actionIndex, 'x');
    await this.page.waitForTimeout(600);
    await this.setEditorValue(actionIndex, '');
  }

  async fillQuery(text: string, actionIndex: number) {
    await this.setEditorValue(actionIndex, text);
  }

  async expandAdvanced(actionIndex: number) {
    await this.getResponseActionItem(actionIndex).getByText('Advanced').click();
  }

  async clearTimeout(actionIndex: number) {
    const timeoutInput = this.getResponseActionItem(actionIndex).locator(
      '[data-test-subj="timeout-input"]'
    );
    await timeoutInput.clear();
  }

  async fillTimeout(value: string, actionIndex: number) {
    const timeoutInput = this.getResponseActionItem(actionIndex).locator(
      '[data-test-subj="timeout-input"]'
    );
    await timeoutInput.fill(value);
  }

  async switchToPackMode(actionIndex: number) {
    await this.getResponseActionItem(actionIndex)
      .getByText('Run a set of queries in a pack')
      .click();
  }

  async selectPack(packName: string, actionIndex: number) {
    const comboBox = this.getResponseActionItem(actionIndex).locator(
      '[data-test-subj="comboBoxInput"]'
    );
    await comboBox.click();
    await comboBox.pressSequentially(packName);
    await this.page.getByRole('option', { name: packName }).click();
  }

  async addEcsMapping(field: string, value: string, actionIndex: number) {
    const item = this.getResponseActionItem(actionIndex);

    await item.locator('[data-test-subj="ECS-field-input"]').click();
    await this.page.keyboard.type(field);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await item.locator('[data-test-subj="osqueryColumnValueSelect"]').click();
    await this.page.keyboard.type(value);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async submitRule() {
    await this.submitButton.click();
  }
}
