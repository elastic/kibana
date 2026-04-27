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

  /** `/osquery/new` in space; 60s wait for first mount (capabilities + data fetches). */
  async gotoNewLiveQueryInSpace(spaceId: string): Promise<void> {
    await this.page.goto(this.kbnUrl.app('osquery/new', { space: spaceId }));
    await this.submitButton.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async gotoPacksInSpace(spaceId: string): Promise<void> {
    await this.page.goto(this.kbnUrl.app('osquery/packs', { space: spaceId }));
    // Wait for table before row interactions (default click timeout is too tight).
    await this.packsTable.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /** Read Discover link href (includes `/s/{spaceId}/app/discover/`). */
  async getDiscoverLinkHref(): Promise<string | null> {
    await this.discoverLink.waitFor({ state: 'visible', timeout: 30_000 });

    return this.discoverLink.getAttribute('href');
  }

  /** Assert Discover href targets the space path. */
  async assertDiscoverLinkRoutesToSpace(spaceId: string): Promise<void> {
    const href = await this.getDiscoverLinkHref();
    if (!href || !href.includes(`/s/${spaceId}/app/discover/`)) {
      throw new Error(
        `Expected Discover link to route to /s/${spaceId}/app/discover/ but got: ${href}`
      );
    }
  }

  /** Runs an existing pack by clicking its play action (stable `data-test-subj` uses saved object id). */
  async runPackBySavedObjectId(savedObjectId: string): Promise<void> {
    const playBtn = this.page.testSubj.locator(`play-pack-${savedObjectId}-button`);
    await playBtn.waitFor({ state: 'visible', timeout: 60_000 });
    await playBtn.click();
  }
}
