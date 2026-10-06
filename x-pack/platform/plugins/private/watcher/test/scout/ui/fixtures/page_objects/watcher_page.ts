/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class WatcherPage {
  readonly createWatchButton: Locator;
  readonly emptyPrompt: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createWatchButton = this.page.testSubj.locator('createWatchButton');
    this.emptyPrompt = this.page.testSubj.locator('emptyPrompt');
  }

  /**
   * Navigate to the Watcher list page and wait for it to be ready.
   *
   * Waiting for `createWatchButton` handles the license propagation race where
   * the Watcher plugin may not register in the Management UI immediately after
   * server start (https://github.com/elastic/kibana/issues/55985).
   */
  async goto(): Promise<void> {
    await this.page.gotoApp('management/insightsAndAlerting/watcher/watches');
    await this.createWatchButton.waitFor();
  }

  /**
   * Create a JSON watch via the UI form.
   * Waits for the watch to appear in the list table before returning.
   */
  async createJsonWatch(id: string, name: string): Promise<void> {
    await this.createWatchButton.click();
    await this.page.testSubj.click('jsonWatchCreateLink');
    await this.page.testSubj.locator('idInput').fill(id);
    await this.page.testSubj.locator('nameInput').fill(name);
    await this.page.testSubj.click('saveWatchButton');
    await this.page.testSubj.locator(`watchIdColumn-${id}`).waitFor();
  }

  /**
   * Return the visible id and name of a watch row in the list table.
   */
  async getWatch(id: string): Promise<{ id: string; name: string }> {
    const watchId = await this.page.testSubj.locator(`watchIdColumn-${id}`).innerText();
    const watchName = await this.page.testSubj.locator(`watchNameColumn-${id}`).innerText();
    return { id: watchId, name: watchName };
  }

  /** Select all watches via the table header checkbox. */
  async selectAllWatches(): Promise<void> {
    await this.page.testSubj.click('checkboxSelectAll');
  }

  /** Click the bulk delete button (requires at least one watch to be selected first). */
  async deleteSelectedWatches(): Promise<void> {
    await this.page.testSubj.click('btnDeleteWatches');
  }

  /** Locator for the server-side error message rendered after a failed save. */
  errorCallout(): Locator {
    return this.page.testSubj.locator('sectionErrorMessage');
  }
}
