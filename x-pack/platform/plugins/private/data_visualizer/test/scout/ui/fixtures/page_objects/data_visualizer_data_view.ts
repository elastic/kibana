/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { setComboBoxValue } from '../combo_box_helpers';
import type { DataVisualizerTable } from './data_visualizer_table';

export class DataVisualizerDataView {
  private readonly fieldEditorForm: Locator;
  private readonly dataSourceSelectorButton: Locator;
  private readonly addFieldButton: Locator;
  private readonly deleteModalConfirmText: Locator;
  private readonly confirmModalConfirmButton: Locator;
  private readonly fieldNameInput: Locator;
  private readonly fieldEditorSaveButton: Locator;
  private readonly customLabelRow: Locator;
  private readonly customLabelInput: Locator;
  private readonly scriptCodeEditor: KibanaCodeEditorWrapper;
  private readonly applyTimeButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly table: DataVisualizerTable) {
    this.fieldEditorForm = this.page.testSubj.locator('indexPatternFieldEditorForm');
    this.dataSourceSelectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');
    this.addFieldButton = this.page.testSubj.locator('indexPattern-add-field');
    this.deleteModalConfirmText = this.page.testSubj.locator('deleteModalConfirmText');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.fieldNameInput = this.page.testSubj.locator('nameField');
    this.fieldEditorSaveButton = this.page.testSubj.locator('fieldSaveButton');
    this.customLabelRow = this.page.testSubj.locator('customLabelRow');
    this.customLabelInput = this.customLabelRow.locator('input');
    this.scriptCodeEditor = new KibanaCodeEditorWrapper(page);
    this.applyTimeButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
  }

  async waitForIndexPatternFieldEditor() {
    await this.fieldEditorForm.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async waitForIndexPatternFieldEditorHidden() {
    await this.fieldEditorForm.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  async getIndexPatternFieldEditorFieldType() {
    const input = this.page.testSubj.locator('typeField input');
    return input.inputValue();
  }

  async setIndexPatternFieldEditorFieldType(type: string) {
    await setComboBoxValue(this.page, 'typeField', type, { optionVisibilityTimeoutMs: 30_000 });
  }

  /**
   * Refreshes field stats via the date picker apply button (matches FTR).
   * Callers should wait on a page-ready signal (loaded table / field row) afterward.
   */
  async refreshFieldStats() {
    await expect(this.applyTimeButton).toBeEnabled({ timeout: 10_000 });
    await this.applyTimeButton.click();
  }

  async addRuntimeField(name: string, script: string, fieldType: string) {
    // Wait for the add-field button to be enabled before clicking — this settles any
    // data-view load race without retrying the entire multi-step form.
    await this.dataSourceSelectorButton.click();
    await expect(this.addFieldButton).toBeEnabled({ timeout: 30_000 });
    await this.addFieldButton.click();
    await this.waitForIndexPatternFieldEditor();
    await this.fieldNameInput.locator('input').fill(name);

    const valueSwitch = this.page.testSubj.locator('valueRow').locator('[role="switch"]');
    if ((await valueSwitch.getAttribute('aria-checked')) !== 'true') {
      await valueSwitch.click();
    }

    // Wait for the accessible Monaco textarea (Discover/Lens pattern) so the React
    // form onChange is wired before we set the model value.
    const scriptEditor = this.page.testSubj
      .locator('scriptFieldRow')
      .getByRole('textbox', { name: /Editor content/ });
    await scriptEditor.waitFor({ state: 'visible', timeout: 10_000 });
    await this.scriptCodeEditor.setCodeEditorValue(script);

    await this.setIndexPatternFieldEditorFieldType(fieldType);
    await expect(this.fieldEditorSaveButton).toBeEnabled({ timeout: 10_000 });
    await this.fieldEditorSaveButton.click();
    await this.waitForIndexPatternFieldEditorHidden();

    // Saving triggers mlTimefilterRefresh$; apply again (FTR does the same). Stats for
    // the new runtime field can take longer than Playwright's default 10s wait.
    await this.refreshFieldStats();
    await this.table.waitForRow(name, { timeout: 60_000 });
  }

  async renameField(originalName: string, newName: string) {
    await this.table.clickEditIndexPatternFieldButton(originalName);
    await this.waitForIndexPatternFieldEditor();
    const customLabelToggle = this.customLabelRow.locator('[role="switch"]');
    await customLabelToggle.waitFor({ state: 'visible', timeout: 10_000 });
    if ((await customLabelToggle.getAttribute('aria-checked')) !== 'true') {
      await customLabelToggle.click();
    }
    await this.customLabelInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.customLabelInput.fill(newName);
    await this.fieldEditorSaveButton.click();
    await this.waitForIndexPatternFieldEditorHidden();
  }

  async confirmDeleteField() {
    await this.deleteModalConfirmText.waitFor({ state: 'visible' });
    await this.deleteModalConfirmText.fill('remove');
    await this.confirmModalConfirmButton.click();
    await this.deleteModalConfirmText.waitFor({ state: 'hidden' });
  }

  async deleteField(fieldName: string) {
    await this.table.clickActionMenuDeleteIndexPatternFieldButton(fieldName);
    await this.confirmDeleteField();
    await this.table.waitForRowHidden(fieldName);
  }
}
