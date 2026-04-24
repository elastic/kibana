/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

/** Page object for Osquery operations inside a user-defined (non-default) Kibana space. */
export class CustomSpacePage {
  public readonly submitButton: Locator;
  public readonly packsTable: Locator;
  public readonly discoverLink: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    this.packsTable = this.page.testSubj.locator('packsTable');
    this.discoverLink = this.page.getByRole('link', { name: 'View in Discover' });
  }

  async gotoOsqueryInSpace(spaceId: string): Promise<void> {
    await this.page.goto(this.kbnUrl.app('osquery', { space: spaceId }));
  }

  /**
   * Navigate to the new-live-query form inside a custom space. Waits up to
   * 60s for the submit button to appear — first render in a freshly-created
   * Scout space must wait for Kibana to mount osquery, resolve capabilities,
   * and hit the app's initial queries, so the 30s default would be too tight.
   *
   * A prior implementation wrapped the wait in try/catch + page.reload() as a
   * defensive retry for spaces where the first app mount missed. The reload
   * workaround hid a real race; callers that see this fail reliably should
   * wrap the call in `expect(...).toPass(...)` at the spec level with a
   * comment linking to the underlying race.
   */
  async gotoNewLiveQueryInSpace(spaceId: string): Promise<void> {
    await this.page.goto(this.kbnUrl.app('osquery/new', { space: spaceId }));
    await this.submitButton.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async gotoPacksInSpace(spaceId: string): Promise<void> {
    await this.page.goto(this.kbnUrl.app('osquery/packs', { space: spaceId }));
    // Wait for the packs table to actually render before callers start
    // hunting for a specific row — otherwise `runPackByName`'s default
    // 10 s click budget is spent waiting for the list query, not the row.
    await this.packsTable.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Returns the Discover link href from the live query results table without clicking it.
   * The href should route to `/s/{spaceId}/app/discover/...`.
   */
  async getDiscoverLinkHref(): Promise<string | null> {
    await this.discoverLink.waitFor({ state: 'visible', timeout: 30_000 });

    return this.discoverLink.getAttribute('href');
  }

  /**
   * Asserts that the Discover link routes to the given space, i.e., href contains
   * `/s/${spaceId}/app/discover/`.
   */
  async assertDiscoverLinkRoutesToSpace(spaceId: string): Promise<void> {
    const href = await this.getDiscoverLinkHref();
    if (!href || !href.includes(`/s/${spaceId}/app/discover/`)) {
      throw new Error(
        `Expected Discover link to route to /s/${spaceId}/app/discover/ but got: ${href}`
      );
    }
  }

  /** Runs an existing pack by clicking its "play" button. */
  async runPackByName(packName: string): Promise<void> {
    // Playwright's default click budget is 10 s — too tight for a fresh
    // Scout space where the packs list query is still in flight when the
    // caller reaches this line. Wait for the row's play button with a real
    // budget instead of relying on the click's internal actionability wait.
    const playBtn = this.page.testSubj.locator(`play-${packName}-button`);
    await playBtn.waitFor({ state: 'visible', timeout: 60_000 });
    await playBtn.click();
  }
}
