/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

interface LensFieldsDeps {
  getFieldListPanelFieldLocator: (field: string) => Locator;
}

/** Lens data-panel field creation, editing, and removal. */
export class LensFields {
  private readonly dataViewSwitcher;
  private readonly addFieldButton;
  private readonly fieldEditor;
  private readonly fieldNameInput;
  private readonly fieldSaveButton;
  private readonly saveConfirmInput;
  private readonly deleteConfirmInput;
  private readonly confirmButton;
  private readonly fieldListLoading;

  constructor(private readonly page: ScoutPage, private readonly deps: LensFieldsDeps) {
    this.dataViewSwitcher = this.page.testSubj.locator('lns-dataView-switch-link');
    this.addFieldButton = this.page.testSubj.locator('indexPattern-add-field');
    this.fieldEditor = this.page.testSubj.locator('fieldEditor');
    this.fieldNameInput = this.fieldEditor.getByRole('textbox', { name: /Name/ });
    this.fieldSaveButton = this.page.testSubj.locator('fieldSaveButton');
    this.saveConfirmInput = this.page.testSubj.locator('saveModalConfirmText');
    this.deleteConfirmInput = this.page.testSubj.locator('deleteModalConfirmText');
    this.confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.fieldListLoading = this.page.testSubj.locator('fieldListLoading');
  }

  availableField(fieldName: string): Locator {
    return this.deps.getFieldListPanelFieldLocator(fieldName);
  }

  async openCreateFieldEditor(): Promise<void> {
    await this.dataViewSwitcher.click();
    await this.addFieldButton.click();
    await this.fieldEditor.waitFor({ state: 'visible' });
  }

  async waitForFieldList(): Promise<void> {
    await this.fieldListLoading.waitFor({ state: 'hidden' });
  }

  async openEditField(fieldName: string): Promise<void> {
    await this.availableField(fieldName).click();
    await this.page.testSubj.locator(`fieldPopoverHeader_editField-${fieldName}`).click();
    await this.fieldEditor.waitFor({ state: 'visible' });
  }

  async renameOpenField(newName: string): Promise<void> {
    await this.fieldNameInput.fill(newName);
    await this.fieldSaveButton.click();
    await this.saveConfirmInput.waitFor({ state: 'visible' });
    await this.saveConfirmInput.fill('change');
    await this.confirmButton.click();
    await this.fieldEditor.waitFor({ state: 'hidden' });
    await this.fieldListLoading.waitFor({ state: 'hidden' });
  }

  async removeField(fieldName: string): Promise<void> {
    const field = this.availableField(fieldName);
    await field.click();
    await this.page.testSubj.locator(`fieldPopoverHeader_deleteField-${fieldName}`).click();
    await this.deleteConfirmInput.waitFor({ state: 'visible' });
    await this.deleteConfirmInput.fill('remove');
    await this.confirmButton.click();
    await this.deleteConfirmInput.waitFor({ state: 'hidden' });
    await this.fieldListLoading.waitFor({ state: 'hidden' });
    await field.waitFor({ state: 'hidden' });
  }
}
