/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { waitForPageReady } from '../../common/constants';

export class PacksPage {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('osquery/packs');
  }

  async navigateToPackDetail(packId: string) {
    await this.page.gotoApp(`osquery/packs/${packId}`);
  }

  async clickAddPack() {
    await this.page.testSubj.locator('add-pack-button').click();
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
      .getByRole('heading', { name: 'Attach next query' })
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => {});
  }

  async clickCancelQueryInFlyout() {
    await this.page.testSubj.locator('query-flyout-cancel-button').click();
  }

  async fillPackName(name: string) {
    const input = this.page.testSubj.locator('packNameInput');
    await input.clear();
    await input.fill(name);
  }

  async fillPackDescription(description: string) {
    const input = this.page.testSubj.locator('packDescriptionInput');
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
    const option = this.page.getByRole('option', { name: new RegExp(policyName, 'i') });
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async selectSavedQuery(queryName: string) {
    const select = this.page.testSubj.locator('savedQuerySelect');
    const input = select.locator('[data-test-subj="comboBoxSearchInput"]');
    await input.click();
    await this.page.testSubj
      .locator('globalLoadingIndicator')
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {});
    await input.fill('');
    await input.pressSequentially(queryName);
    // EUI combo box options include the query name as bold text followed by description.
    // Use locator chaining: find options that have an element whose text content is exactly the query name.
    const option = this.page
      .locator('[role="option"]')
      .filter({ has: this.page.locator(`strong:text-is("${queryName}")`) });
    await option.waitFor({ state: 'visible', timeout: 30_000 });
    await option.click();
  }

  /**
   * Ensures all packs are visible by increasing the table page size.
   * This is needed because accumulated packs from previous test runs may cause pagination.
   */
  async ensureAllPacksVisible() {
    // Wait for the table to load first
    await this.page
      .locator('table caption')
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});

    // Use EUI data-test-subj for the pagination popover button
    const rowsPerPageBtn = this.page.testSubj.locator('tablePaginationPopoverButton');
    if (await rowsPerPageBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rowsPerPageBtn.click();

      // Use EUI data-test-subj selectors for page size options
      const hundredRows = this.page.testSubj.locator('tablePagination-100-rows');
      const fiftyRows = this.page.testSubj.locator('tablePagination-50-rows');

      if (await hundredRows.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await hundredRows.click();
      } else if (await fiftyRows.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await fiftyRows.click();
      } else {
        await this.page.keyboard.press('Escape');
      }

      await waitForPageReady(this.page);
    }
  }

  async changePackActiveStatus(packName: string) {
    await this.findItemOnPage(packName);
    const toggle = this.page.locator(`[aria-label="${packName}"]`);
    await toggle.waitFor({ state: 'visible', timeout: 30_000 });
    // Wait for the toggle to become enabled (may be disabled during API transitions)
    await expect(toggle).toBeEnabled({ timeout: 30_000 });
    await toggle.click();
    // Wait for confirmation modal if present
    const confirmBtn = this.page.testSubj.locator('confirmModalConfirmButton');
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Wait for the toggle state change to settle
    await waitForPageReady(this.page);
  }

  /**
   * Navigate through table pages until an item with the given name is visible.
   */
  private async findItemOnPage(name: string) {
    // eslint-disable-next-line playwright/no-nth-methods -- pagination may show duplicate names across pages
    const target = this.page.locator(`[aria-label="${name}"]`).first();
    const caption = await this.page
      .locator('table caption')
      .textContent()
      .catch(() => '');
    const pageMatch = caption?.match(/Page \d+ of (\d+)/);
    const totalPages = pageMatch ? parseInt(pageMatch[1], 10) : 1;

    for (let p = 1; p <= totalPages; p++) {
      if (await target.isVisible({ timeout: 2_000 }).catch(() => false)) {
        return;
      }

      if (p < totalPages) {
        const pageLink = this.page.getByRole('link', {
          name: `Page ${p + 1} of ${totalPages}`,
        });
        if (await pageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await pageLink.dispatchEvent('click');
          await waitForPageReady(this.page);
        }
      }
    }
  }

  async clickPackByName(packName: string) {
    // Always navigate to the packs list to ensure we're on the right page
    await this.navigate();

    // eslint-disable-next-line playwright/no-nth-methods -- multiple packs may share name in DOM during pagination
    const link = this.page.locator('tbody').getByRole('link', { name: packName }).first();

    // Determine total pages from table caption (e.g., "Page 1 of 5.")
    const caption = await this.page
      .locator('table caption')
      .textContent()
      .catch(() => '');
    const pageMatch = caption?.match(/Page \d+ of (\d+)/);
    const totalPages = pageMatch ? parseInt(pageMatch[1], 10) : 1;

    // Iterate through each page to find the pack
    for (let p = 1; p <= totalPages; p++) {
      if (await link.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await link.click();

        return;
      }

      if (p < totalPages) {
        // Click the specific page number link for in-memory table pagination.
        const pageLink = this.page.getByRole('link', {
          name: `Page ${p + 1} of ${totalPages}`,
        });
        if (await pageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await pageLink.dispatchEvent('click');
          await waitForPageReady(this.page);
        }
      }
    }

    // Final attempt — let it throw with a clear message
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await link.click();
  }

  async deleteAndConfirm(type: string) {
    await this.page.getByText(`Delete ${type}`).click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async getTableRowCount(): Promise<number> {
    return this.page.locator('tbody').getByRole('row').count();
  }

  async editSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Edit ${queryName}"]`).click();
  }

  async runSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Run ${queryName}"]`).click();
  }
}
