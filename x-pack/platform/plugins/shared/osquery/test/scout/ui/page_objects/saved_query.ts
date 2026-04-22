/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

export class SavedQueryPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToList(): Promise<void> {
    await this.page.gotoApp('osquery/saved_queries');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    await this.page.testSubj
      .locator('savedQueriesTable')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickCreateQuery(): Promise<void> {
    await this.page.testSubj.locator('savedQueriesCreateQueryButton').click();
  }

  async openRowActionsMenu(queryId: string): Promise<void> {
    await this.page.getByRole('button', { name: `Actions for ${queryId}` }).click();
  }

  // The row-actions menu renders inside an EuiPopover with `role="dialog"` (not
  // a `menu` role), and each action is a plain `<button>` — NOT an EUI context
  // menu's `menuitem`. Source: `public/routes/saved_queries/list/saved_query_row_actions.tsx`.
  // Scope to the popover dialog so we match the right button when multiple rows
  // render the same label elsewhere on the page.
  private rowActionsDialog() {
    return this.page.getByRole('dialog');
  }

  async chooseEditQuery(): Promise<void> {
    await this.rowActionsDialog().getByRole('button', { name: 'Edit query' }).click();
  }

  async chooseDuplicateQuery(): Promise<void> {
    await this.rowActionsDialog().getByRole('button', { name: 'Duplicate query' }).click();
  }

  async chooseDeleteQuery(): Promise<void> {
    await this.rowActionsDialog().getByRole('button', { name: 'Delete query' }).click();
  }

  async clickRunSavedQuery(queryId: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`Run ${queryId}`) }).click();
  }

  async clickUpdateButton(): Promise<void> {
    await this.page.testSubj.locator('update-query-button').click();
  }

  async fillIdField(id: string): Promise<void> {
    const idInput = this.page.getByRole('textbox', { name: 'ID' });
    await idInput.clear();
    await idInput.fill(id);
  }

  async fillDescriptionField(description: string): Promise<void> {
    const descInput = this.page.getByRole('textbox', { name: 'Description (optional)' });
    await descInput.clear();
    await descInput.fill(description);
  }

  async fillIntervalField(interval: string): Promise<void> {
    const intervalInput = this.page.testSubj.locator('osquery-interval-field');
    await intervalInput.clear();
    await intervalInput.fill(interval);
  }

  async confirmDeleteModal(): Promise<void> {
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }
}
