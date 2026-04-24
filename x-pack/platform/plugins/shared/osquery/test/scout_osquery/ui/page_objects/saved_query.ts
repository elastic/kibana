/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SavedQueryPage {
  public readonly savedQueriesTable: Locator;
  public readonly createQueryButton: Locator;
  public readonly rowActionsDialog: Locator;
  public readonly editQueryButton: Locator;
  public readonly duplicateQueryButton: Locator;
  public readonly deleteQueryButton: Locator;
  public readonly updateQueryButton: Locator;
  public readonly confirmModalButton: Locator;
  public readonly idInput: Locator;
  public readonly descriptionInput: Locator;
  public readonly intervalInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.savedQueriesTable = this.page.testSubj.locator('savedQueriesTable');
    this.createQueryButton = this.page.testSubj.locator('savedQueriesCreateQueryButton');
    // Row actions live in a dialog popover (role=dialog), not a menuitem list — scope to dialog.
    this.rowActionsDialog = this.page.getByRole('dialog');
    this.editQueryButton = this.rowActionsDialog.getByRole('button', { name: 'Edit query' });
    this.duplicateQueryButton = this.rowActionsDialog.getByRole('button', {
      name: 'Duplicate query',
    });
    this.deleteQueryButton = this.rowActionsDialog.getByRole('button', { name: 'Delete query' });
    this.updateQueryButton = this.page.testSubj.locator('update-query-button');
    this.confirmModalButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.idInput = this.page.getByRole('textbox', { name: 'ID' });
    this.descriptionInput = this.page.getByRole('textbox', { name: 'Description (optional)' });
    this.intervalInput = this.page.testSubj.locator('osquery-interval-field');
  }

  async navigateToList(): Promise<void> {
    await this.page.gotoApp('osquery/saved_queries');
    await this.savedQueriesTable.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickCreateQuery(): Promise<void> {
    await this.createQueryButton.click();
  }

  async openRowActionsMenu(queryId: string): Promise<void> {
    await this.page.getByRole('button', { name: `Actions for ${queryId}` }).click();
  }

  async chooseEditQuery(): Promise<void> {
    await this.editQueryButton.click();
  }

  async chooseDuplicateQuery(): Promise<void> {
    await this.duplicateQueryButton.click();
  }

  async chooseDeleteQuery(): Promise<void> {
    await this.deleteQueryButton.click();
  }

  async clickRunSavedQuery(queryId: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`Run ${queryId}`) }).click();
  }

  async clickUpdateButton(): Promise<void> {
    await this.updateQueryButton.click();
  }

  async fillIdField(id: string): Promise<void> {
    await this.idInput.clear();
    await this.idInput.fill(id);
  }

  async fillDescriptionField(description: string): Promise<void> {
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(description);
  }

  async fillIntervalField(interval: string): Promise<void> {
    await this.intervalInput.clear();
    await this.intervalInput.fill(interval);
  }

  async confirmDeleteModal(): Promise<void> {
    await this.confirmModalButton.click();
  }
}
