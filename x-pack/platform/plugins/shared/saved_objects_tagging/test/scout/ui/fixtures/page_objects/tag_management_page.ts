/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

interface FillTagFormFields {
  name?: string;
  color?: string;
  description?: string;
}

export class TagManagementPage {
  constructor(private readonly page: ScoutPage) {}

  async waitForTableLoaded() {
    await this.page.testSubj.waitForSelector('tagsManagementTable table-is-ready');
  }

  async openCreateModal() {
    await this.page.testSubj.click('createTagButton');
    await this.page.testSubj.waitForSelector('tagModalForm');
  }

  async fillForm(fields: FillTagFormFields, { submit = false }: { submit?: boolean } = {}) {
    if (fields.name !== undefined) {
      await this.page.testSubj.click('createModalField-name');
      await this.page.testSubj.fill('createModalField-name', fields.name);
    }
    if (fields.color !== undefined) {
      await this.page.testSubj.click('~createModalField-color');
      await this.page.testSubj.fill('~createModalField-color', fields.color);
      // Close color picker popover before continuing
      await this.page.testSubj.locator('euiSaturation').waitFor({ state: 'visible' });
      await this.page.keyboard.press('Enter');
      await this.page.testSubj.locator('euiSaturation').waitFor({ state: 'hidden' });
    }
    if (fields.description !== undefined) {
      await this.page.testSubj.click('createModalField-description');
      await this.page.testSubj.fill('createModalField-description', fields.description);
    }
    if (submit) {
      await this.page.testSubj.click('createModalConfirmButton');
      await this.getTagModalForm().waitFor({ state: 'hidden' });
      await this.waitForTableLoaded();
    }
  }

  async openCollapsedRowMenu(rowIndex = 0) {
    const rows = await this.page.testSubj.locator('tagsTableRow').all();
    const row = rows[rowIndex];
    if (!row) {
      throw new Error(`Tag row at index ${rowIndex} was not found`);
    }
    const collapseBtn = row.locator('[data-test-subj="euiCollapsedItemActionsButton"]');
    await collapseBtn.waitFor({ state: 'visible' });
    await collapseBtn.click();
  }

  async clickActionItem(action: string) {
    // Scope to the EUI portal where collapsed-menu items render, avoiding the
    // always-present inline row buttons that share the same data-test-subj.
    await this.page
      .locator('[data-euiportal="true"]')
      .locator(`[data-test-subj="tagsTableAction-${action}"]`)
      .click();
  }

  async openBulkActionMenu() {
    await this.page.testSubj.click('actionBar-contextMenuButton');
  }

  async selectAllTags() {
    await this.page.testSubj.click('checkboxSelectAll');
  }

  getTagModalForm() {
    return this.page.testSubj.locator('tagModalForm');
  }

  getAssignFlyoutCloseButton() {
    return this.page.testSubj.locator('euiFlyoutCloseButton');
  }
}
