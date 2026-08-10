/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface TagFormFields {
  name?: string;
  color?: string;
  description?: string;
}

// Owns interactions with the create/edit tag modal only.
export class TagModal {
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly colorInput: Locator;
  readonly descriptionInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.form = page.testSubj.locator('tagModalForm');
    this.nameInput = page.testSubj.locator('createModalField-name');
    this.colorInput = page.testSubj.locator('~createModalField-color');
    this.descriptionInput = page.testSubj.locator('createModalField-description');
    this.confirmButton = page.testSubj.locator('createModalConfirmButton');
    this.cancelButton = page.testSubj.locator('createModalCancelButton');
  }

  async openCreate() {
    await this.page.testSubj.click('createTagButton');
    await this.form.waitFor({ state: 'visible' });
  }

  async fillForm(fields: TagFormFields) {
    if (fields.name !== undefined) {
      await this.nameInput.fill(fields.name);
    }
    if (fields.color !== undefined) {
      await this.colorInput.click();
      await this.colorInput.fill(fields.color);
      const saturationPopover = this.page.testSubj.locator('euiSaturation');
      await saturationPopover.waitFor({ state: 'visible' });
      // ENTER closes the color picker so it doesn't intercept clicks on later fields.
      await this.page.keyboard.press('Enter');
      await saturationPopover.waitFor({ state: 'hidden' });
    }
    if (fields.description !== undefined) {
      await this.descriptionInput.fill(fields.description);
    }
  }

  async cancel() {
    await this.cancelButton.click();
    await this.form.waitFor({ state: 'hidden' });
  }

  async closeIfOpen() {
    if (await this.isOpen()) {
      await this.cancel();
    }
  }

  async isOpen() {
    return this.form.isVisible();
  }

  async hasError() {
    const errors = await this.getValidationErrors();
    return Boolean(errors.name || errors.color || errors.description);
  }

  async getValidationErrors(): Promise<TagFormFields> {
    const errorRows = [
      'createModalRow-name',
      'createModalRow-color',
      'createModalRow-description',
    ] as const;
    const [name, color, description] = await Promise.all(
      errorRows.map(async (rowTestSubj) => {
        const errors = await this.page.testSubj
          .locator(rowTestSubj)
          .locator('.euiFormErrorText')
          .allInnerTexts();
        return errors.length === 0 ? undefined : errors[0].trim();
      })
    );
    return { name, color, description };
  }

  async getFormValues(): Promise<Required<TagFormFields>> {
    const [name, color, description] = await Promise.all([
      this.nameInput.inputValue(),
      this.colorInput.inputValue(),
      this.descriptionInput.inputValue(),
    ]);
    return { name, color, description };
  }

  async isConfirmDisabled() {
    return this.confirmButton.isDisabled();
  }
}
