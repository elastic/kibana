/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the Graph listing page (`/app/graph`).
 *
 * Locators target the Content List `data-test-subj` attributes rather than
 * the deprecated `TableListView` selectors.
 */
export class GraphListingPage {
  readonly createGraphButton: Locator;
  readonly emptyPromptButton: Locator;
  readonly searchBox: Locator;
  readonly itemLinks: Locator;
  readonly deleteButton: Locator;
  readonly deleteConfirm: Locator;
  readonly tableSelectAll: Locator;
  readonly pageHeader: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createGraphButton = this.page.testSubj.locator('newItemButton');
    this.emptyPromptButton = this.page.testSubj.locator('graphCreateGraphPromptButton');
    this.searchBox = this.page.testSubj.locator('contentListToolbar-searchBox');
    this.itemLinks = this.page.testSubj.locator('content-list-table-item-link');
    this.deleteButton = this.page.testSubj.locator('contentListToolbar-selectionBar-deleteButton');
    this.deleteConfirm = this.page.testSubj.locator('confirmModalConfirmButton');
    this.tableSelectAll = this.page.locator('thead input[type="checkbox"]');
    this.pageHeader = this.page.testSubj.locator('top-nav');
  }

  /** Navigate to the Graph listing page via deep link. */
  async goto() {
    await this.page.gotoApp('graph');
  }

  /** Type a search query into the toolbar search box. */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
    await this.searchBox.press('Enter');
  }

  /** Select all items and delete them via the selection bar. */
  async selectAllAndDelete() {
    await this.tableSelectAll.check();
    await this.deleteButton.click();
    await this.deleteConfirm.click();
  }
}
