/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

import { TagAssignFlyout } from './tag_assign_flyout';
import { TagModal } from './tag_modal';
import { TagsTable } from './tags_table';

export interface SubmitTagModalOptions {
  // When false, do not wait for the modal to close (e.g. when validation is
  // expected to fail and the modal stays open).
  waitForClose?: boolean;
}

// Composes the three surface-scoped page objects (tagsTable, tagModal,
// assignFlyout) and exposes orchestration methods for flows that span more
// than one surface.
export class TagManagementPage {
  readonly tagsTable: TagsTable;
  readonly tagModal: TagModal;
  readonly assignFlyout: TagAssignFlyout;

  constructor(private readonly page: ScoutPage) {
    this.tagsTable = new TagsTable(page);
    this.tagModal = new TagModal(page);
    this.assignFlyout = new TagAssignFlyout(page);
  }

  async editTag(tagName: string) {
    const row = this.tagsTable.rowByName(tagName);
    await row.locator('[data-test-subj="tagsTableAction-edit"]').click();
    await this.tagModal.form.waitFor({ state: 'visible' });
  }

  async submitTagModal({ waitForClose = true }: SubmitTagModalOptions = {}) {
    await this.tagModal.confirmButton.click();
    if (waitForClose) {
      await this.tagModal.form.waitFor({ state: 'hidden' });
      await this.tagsTable.waitForLoaded();
    }
  }

  // Selects rows, opens the bulk assign menu, waits for results.
  async openAssignFlyoutForTags(tagNames: string[]) {
    for (const tagName of tagNames) {
      await this.tagsTable.selectTagByName(tagName);
    }
    await this.tagsTable.runBulkAction('assign');
    await this.assignFlyout.waitForResultsLoaded();
  }

  async confirmAssignFlyout() {
    await this.assignFlyout.confirmButton.click();
    await this.assignFlyout.closeButton.waitFor({ state: 'hidden' });
    await this.tagsTable.waitForLoaded();
  }

  async cancelAssignFlyout() {
    await this.assignFlyout.cancelButton.click();
    await this.assignFlyout.closeButton.waitFor({ state: 'hidden' });
    await this.tagsTable.waitForLoaded();
  }

  async selectSavedObjectTags(...tagNames: string[]) {
    await this.page.testSubj.click('savedObjectTagSelector');
    for (const tagName of tagNames) {
      await this.page.testSubj.click(`tagSelectorOption-${tagName.replace(' ', '_')}`);
    }
    const savedObjectTitleInput = this.page.testSubj.locator('savedObjectTitle');
    if (await savedObjectTitleInput.isVisible()) {
      await savedObjectTitleInput.click();
      return;
    }

    const dashboardTitleInput = this.page.testSubj.locator('dashboardTitleInput');
    if (await dashboardTitleInput.isVisible()) {
      await dashboardTitleInput.click();
      return;
    }

    // Fallback blur in case selector host varies by form.
    await this.page.keyboard.press('Escape');
  }

  async openCreateTagFromSelector() {
    await this.page.testSubj.click('savedObjectTagSelector');
    await this.page.testSubj.click('tagSelectorOption-action__create');
    await this.page.testSubj.waitForSelector('tagModalForm');
  }
}
