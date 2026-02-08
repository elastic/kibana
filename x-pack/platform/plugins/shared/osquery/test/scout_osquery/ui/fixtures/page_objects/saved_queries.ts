/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../../common/constants';

export class SavedQueriesPage {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('osquery/saved_queries');
    await waitForPageReady(this.page);
  }

  async clickNewSavedQuery() {
    await this.page.testSubj.locator('add-query-button').click();
  }

  async clickEditSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Edit ${queryName}"]`).click();
  }

  async clickRunSavedQuery(queryName: string) {
    await this.page.locator(`[aria-label="Run ${queryName}"]`).click();
  }

  async clickUpdateButton() {
    await this.page.testSubj.locator('update-query-button').click();
  }

  async fillIdField(id: string) {
    const idInput = this.page.locator('input[name="id"]');
    await idInput.clear();
    await idInput.fill(id);
  }

  async fillDescriptionField(description: string) {
    const descInput = this.page.locator('input[name="description"]');
    await descInput.clear();
    await descInput.fill(description);
  }

  async fillIntervalField(interval: string) {
    const intervalInput = this.page.locator('input[name="interval"]');
    await intervalInput.clear();
    await intervalInput.fill(interval);
  }

  async deleteAndConfirm(type: string) {
    await this.page.getByText(`Delete ${type}`).click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }
}
