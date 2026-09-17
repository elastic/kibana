/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { ContentListWrapper } from '@kbn/scout';

const LISTING_TIMEOUT = 20_000;

/**
 * Page object for the Graph listing page (`/app/graph#/home`).
 *
 * Generic Content List interactions (toolbar search, sort, selection, etc.)
 * are delegated to {@link ContentListWrapper}; this class only owns
 * Graph-specific navigation and CTAs.
 */
export class GraphListingPage {
  readonly contentList: ContentListWrapper;
  readonly createGraphButton: Locator;
  readonly emptyPromptCreateButton: Locator;
  readonly appHeader: Locator;
  private readonly emptyState: Locator;
  private readonly appMenuOverflowButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.contentList = new ContentListWrapper(page);
    this.createGraphButton = this.page.testSubj.locator('graphCreateGraphButton');
    this.emptyPromptCreateButton = this.page.testSubj.locator('graphCreateGraphPromptButton');
    this.appHeader = this.page.testSubj.locator('appHeader');
    this.emptyState = this.page.testSubj.locator('content-list-emptyState');
    this.appMenuOverflowButton = this.page.testSubj.locator('app-menu-overflow-button');
  }

  /**
   * Wait for the search input or empty state. Do not `.or()` the empty-state
   * create button — it is nested inside `content-list-emptyState` and trips
   * Playwright strict mode when both are visible.
   */
  async waitForReady() {
    await this.emptyState
      .or(this.contentList.searchBox)
      .waitFor({ state: 'visible', timeout: LISTING_TIMEOUT });
  }

  /** Navigate to the Graph listing page and wait for the list to settle. */
  async goto() {
    await this.page.gotoApp('graph');
    await this.waitForReady();
  }

  async clickCreateGraph() {
    if (await this.emptyPromptCreateButton.isVisible()) {
      await this.emptyPromptCreateButton.click();
      return;
    }
    if (!(await this.createGraphButton.isVisible())) {
      await this.appMenuOverflowButton.click();
      await this.createGraphButton.waitFor({ state: 'visible' });
    }
    await this.createGraphButton.click();
  }
}
