/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Osquery left-nav and deep links. With `queryHistoryRework` enabled (default in tests),
 * the app redirects `/` → `/history`, new query lives at `/new`, and `/live_queries` redirects to history.
 *
 * Use pathname-style `gotoApp('osquery/...')` (not `hash:`): Kibana scoped history lives in the URL
 * path (`/app/osquery/new`), matching Cypress (`/app/osquery/new`). A URL hash does not activate routes.
 */
export class OsqueryNavigation {
  public readonly liveQuerySubmitButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.liveQuerySubmitButton = this.page.testSubj.locator('liveQuerySubmitButton');
  }

  async gotoRoot(): Promise<void> {
    await this.page.gotoApp('osquery');
  }

  async gotoHistory(): Promise<void> {
    await this.page.gotoApp('osquery/history');
  }

  async gotoPacks(): Promise<void> {
    await this.page.gotoApp('osquery/packs');
  }

  async gotoSavedQueries(): Promise<void> {
    await this.page.gotoApp('osquery/saved_queries');
  }

  /** New live query form (`/new` when queryHistoryRework is on, else `/live_queries/new`). */
  async gotoNewLiveQuery(): Promise<void> {
    await this.page.gotoApp('osquery/new');
    await this.liveQuerySubmitButton.waitFor({ state: 'visible', timeout: 30_000 });
  }
}
