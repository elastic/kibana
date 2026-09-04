/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// Drives the data-view editor for the rollup type plus the data-view list. Modeled on
// `@kbn/data-view-editor-plugin`'s Scout `DataViewEditorPage` (validation/save waits), with the
// rollup-type selection and time-field set it lacks. Open the wizard via
// `pageObjects.dataViewsManagement.openCreateWizard()` before calling `fillRollupDataView`.
export class RollupDataViewPage {
  readonly flyout: Locator;
  readonly form: Locator;
  readonly titleInput: Locator;
  readonly saveButton: Locator;
  readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.testSubj.locator('indexPatternEditorFlyout');
    this.form = page.testSubj.locator('indexPatternEditorForm');
    this.titleInput = page.testSubj.locator('createIndexPatternTitleInput');
    this.saveButton = page.testSubj.locator('saveIndexPatternButton');
    this.table = page.testSubj.locator('indexPatternTable');
  }

  // Fill and save a rollup-type data view for the given index pattern and time field.
  async fillRollupDataView(indexPattern: string, timeField: string): Promise<void> {
    await this.page.testSubj.locator('typeField').click();
    await this.page.testSubj.locator('rollupType').click();

    await this.typeIndexPattern(indexPattern);
    await this.form
      .and(this.page.locator('[data-validation-error="0"]'))
      .waitFor({ state: 'visible', timeout: 30_000 });

    // The editor disables the timestamp combo box until its options resolve, which happens after
    // title validation clears — open it only once it is enabled, or the dropdown renders empty.
    const timestampField = this.page.testSubj.locator('timestampField');
    await timestampField
      .getByTestId('comboBoxSearchInput')
      .and(this.page.locator(':not([disabled])'))
      .waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.components
      .comboBox('timestampField')
      .setSelectedOptions([timeField], { timeout: 15_000 });

    await this.saveButton.click();
    await this.flyout.waitFor({ state: 'hidden' });
  }

  // Type char-by-char, settling validation between keystrokes: a single `fill()` hangs a rollup
  // alias's title validation and blocks Save.
  private async typeIndexPattern(indexPattern: string): Promise<void> {
    await this.titleInput.click();
    // First two chars together, to skip the field's one-character wildcard auto-append.
    await this.titleInput.fill(indexPattern.slice(0, 2));
    const settled = this.titleInput.and(this.page.locator('[data-is-validating="0"]'));
    for (const char of indexPattern.slice(2)) {
      await this.titleInput.pressSequentially(char);
      await settled.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await expect(this.titleInput).toHaveValue(indexPattern);
    await settled.waitFor({ state: 'visible', timeout: 15_000 });
  }

  // A data-view list row matched by its exact name, so assertions target this suite's data view.
  dataViewRow(name: string): Locator {
    return this.table
      .locator('tbody tr')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async openDataView(name: string): Promise<void> {
    await this.dataViewRow(name).getByRole('link', { name }).click();
    await this.page.testSubj.locator('editIndexPattern').waitFor({ state: 'visible' });
  }

  // Unique field names shown on the data-view detail page. Each cell renders the name plus a
  // trailing icon on a new line, so take the first whitespace-delimited token and de-dupe.
  async fieldNames(): Promise<string[]> {
    const cells = this.page.testSubj
      .locator('editIndexPattern')
      .locator('[data-test-subj="indexedFieldName"]');
    const names = await cells.allInnerTexts();
    return [...new Set(names.map((name) => name.trim().split(/\s+/)[0]).filter(Boolean))];
  }
}
