/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import type { ScoutPage } from '@kbn/scout';
import { waitForPageReady } from '../../common/constants';

export class PacksPage {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('osquery/packs');
    await waitForPageReady(this.page);
  }

  async clickAddPack() {
    await this.page.testSubj.locator('add-pack-button').first().click();
  }

  async clickEditPack() {
    await this.page.testSubj.locator('edit-pack-button').click();
  }

  async clickSavePack() {
    await this.page.testSubj.locator('save-pack-button').click();
  }

  async clickUpdatePack() {
    await this.page.testSubj.locator('update-pack-button').click();
    // Handle "Save and deploy changes" confirmation modal if it appears
    const confirmBtn = this.page.testSubj.locator('confirmModalConfirmButton');
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  async clickAddQuery() {
    await this.page.testSubj.locator('add-query-button').click();
  }

  async clickSaveQueryInFlyout() {
    await this.page.testSubj.locator('query-flyout-save-button').click();
    // Wait for the flyout to close (the "Attach next query" heading disappears)
    await this.page
      .getByText('Attach next query')
      .first()
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => {});
  }

  async clickCancelQueryInFlyout() {
    await this.page.testSubj.locator('query-flyout-cancel-button').click();
  }

  async fillPackName(name: string) {
    const input = this.page.locator('input[name="name"]');
    await input.clear();
    await input.fill(name);
  }

  async fillPackDescription(description: string) {
    const input = this.page.locator('input[name="description"]');
    await input.clear();
    await input.fill(description);
  }

  async fillFormField(fieldName: string, value: string) {
    const input = this.page.locator(`input[name="${fieldName}"]`);
    await input.clear();
    await input.fill(value);
  }

  async selectPolicy(policyName: string) {
    const comboBox = this.page.testSubj
      .locator('policyIdsComboBox')
      .locator('[data-test-subj="comboBoxInput"]');
    await comboBox.click();
    await comboBox.pressSequentially(policyName);
    const option = this.page.getByRole('option', { name: new RegExp(policyName, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async selectSavedQuery(queryName: string) {
    const select = this.page.testSubj.locator('savedQuerySelect');
    await select.click();
    const option = this.page.getByRole('option', { name: new RegExp(queryName, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  /**
   * Ensures all packs are visible by increasing the table page size to 50 rows.
   * This is needed because accumulated packs from previous test runs may cause pagination.
   */
  private async ensureAllPacksVisible() {
    const paginationButton = this.page.testSubj.locator('tablePaginationPopoverButton');
    if (await paginationButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await paginationButton.click();
      const fiftyRowsOption = this.page.testSubj.locator('tablePagination-50-rows');
      await fiftyRowsOption.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
      if (await fiftyRowsOption.isVisible()) {
        await fiftyRowsOption.click({ force: true });
      }

      // Close the popover if it's still open (press Escape)
      await this.page.keyboard.press('Escape');
    }
  }

  async changePackActiveStatus(packName: string) {
    await this.ensureAllPacksVisible();
    const toggle = this.page.locator(`[aria-label="${packName}"]`);
    await toggle.waitFor({ state: 'visible', timeout: 10_000 });
    await toggle.click();
    // Wait for confirmation modal if present
    const confirmBtn = this.page.testSubj.locator('confirmModalConfirmButton');
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  async clickPackByName(packName: string) {
    await this.ensureAllPacksVisible();
    // Use a table cell link to be specific and avoid strict mode violations
    const link = this.page.locator('tbody').getByRole('link', { name: packName }).first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await link.click();
  }

  async deleteAndConfirm(type: string) {
    await this.page.getByText(`Delete ${type}`).click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async getTableRowCount(): Promise<number> {
    return this.page.locator('tbody > tr').count();
  }

  async editSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Edit ${queryName}"]`).click();
  }

  async runSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Run ${queryName}"]`).click();
  }
}
