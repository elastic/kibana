/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Osquery left-nav and deep links. With `queryHistoryRework` enabled (default in tests),
 * the app redirects `/` → `/history`, new query lives at `/new`, and `/live_queries` redirects to history.
 */
export class OsqueryNavigation {
  constructor(private readonly page: ScoutPage) {}

  async gotoRoot(): Promise<void> {
    await this.page.gotoApp('osquery');
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
  }

  async gotoHistory(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/history' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
  }

  async gotoLiveQueriesLegacy(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/live_queries' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
  }

  async gotoPacks(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/packs' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
  }

  async gotoSavedQueries(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/saved_queries' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
  }

  /** New live query form (`/new` when queryHistoryRework is on, else `/live_queries/new`). */
  async gotoNewLiveQuery(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/new' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
    await this.page.testSubj
      .locator('liveQuerySubmitButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Legacy deep link; with queryHistoryRework, router redirects to `/new`. */
  async gotoNewLiveQueryLegacyPath(): Promise<void> {
    await this.page.gotoApp('osquery', { hash: '/live_queries/new' });
    await this.page.waitForLoadingIndicatorHidden().catch(() => {});
    await this.page.testSubj
      .locator('liveQuerySubmitButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }
}
