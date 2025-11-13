/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class IndexManagement {
  constructor(public readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('management/data/index_management');
  }

  async sectionHeadingText() {
    return await this.page.testSubj.locator('appTitle').textContent();
  }

  async changeTabs(
    tab:
      | 'indicesTab'
      | 'data_streamsTab'
      | 'templatesTab'
      | 'component_templatesTab'
      | 'enrich_policiesTab'
  ) {
    await this.page.testSubj.locator(tab).click();
  }

  async clickCreateIndexButton() {
    await this.page.testSubj.locator('createIndexButton').click();
  }

  async setCreateIndexName(value: string) {
    const nameField = this.page.testSubj.locator('createIndexNameFieldText');
    await nameField.waitFor({ state: 'visible' });
    await nameField.fill(value);
  }

  async setCreateIndexMode(value: string) {
    const modeField = this.page.testSubj.locator('indexModeField');
    await modeField.waitFor({ state: 'visible' });
    // await this.page.pause();
    await modeField.click();
    await this.page.testSubj.locator(`indexMode${value}Option`).click();
  }

  async clickCreateIndexSaveButton() {
    const saveButton = this.page.testSubj.locator('createIndexSaveButton');
    await saveButton.waitFor({ state: 'visible' });
    await saveButton.click();
    // Wait for modal to close
    await saveButton.waitFor({ state: 'hidden', timeout: 30000 });
  }

  async expectIndexToExist(indexName: string) {
    // Wait for the table to be visible
    const table = this.page.locator('table');
    await table.waitFor({ state: 'visible' });

    // Get all index name links
    const indexLinks = this.page.testSubj.locator('indexTableIndexNameLink');
    const count = await indexLinks.count();

    // Check if any of the links contain the index name
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await indexLinks.nth(i).textContent();
      if (text === indexName) {
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Expected index "${indexName}" to exist in the table, but it was not found`);
    }
  }
}
