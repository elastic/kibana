/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
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
  private readonly customLabelSwitch: Locator;
  private readonly customLabelInput: Locator;
  private readonly scriptCodeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly table: DataVisualizerTable) {
    this.fieldEditorForm = this.page.testSubj.locator('indexPatternFieldEditorForm');
    this.dataSourceSelectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');
    this.addFieldButton = this.page.testSubj.locator('indexPattern-add-field');
    this.deleteModalConfirmText = this.page.testSubj.locator('deleteModalConfirmText');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.fieldNameInput = this.page.testSubj.locator('nameField');
    this.fieldEditorSaveButton = this.page.testSubj.locator('fieldSaveButton');
    this.customLabelSwitch = this.page.testSubj.locator('customLabelSwitch');
    this.customLabelInput = this.page.testSubj.locator('customLabelField');
    this.scriptCodeEditor = new KibanaCodeEditorWrapper(page);
  }

  async waitForIndexPatternFieldEditor() {
    await this.fieldEditorForm.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForIndexPatternFieldEditorHidden() {
    await this.fieldEditorForm.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async getIndexPatternFieldEditorFieldType() {
    const input = this.page.testSubj.locator('typeField input');
    return input.inputValue();
  }

  async setIndexPatternFieldEditorFieldType(type: string) {
    await setComboBoxValue(this.page, 'typeField', type);
    await expect.poll(async () => this.getIndexPatternFieldEditorFieldType()).toBe(type);
  }

  async addRuntimeField(name: string, script: string, fieldType: string) {
    await this.dataSourceSelectorButton.click();
    await this.addFieldButton.click();
    await this.waitForIndexPatternFieldEditor();
    await this.fieldNameInput.locator('input').fill(name);
    const valueSwitch = this.page.testSubj.locator('valueRow').locator('[role="switch"]');
    if ((await valueSwitch.getAttribute('aria-checked')) !== 'true') {
      await valueSwitch.click();
    }
    await this.scriptCodeEditor.waitCodeEditorReady('scriptFieldRow');
    await this.scriptCodeEditor.setCodeEditorValue(script);
    await this.setIndexPatternFieldEditorFieldType(fieldType);
    await this.fieldEditorSaveButton.click();
    await this.waitForIndexPatternFieldEditorHidden();
  }

  async renameField(originalName: string, newName: string) {
    await this.table.clickEditIndexPatternFieldButton(originalName);
    await this.waitForIndexPatternFieldEditor();
    await this.customLabelSwitch.click();
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
