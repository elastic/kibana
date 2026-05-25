/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { ListingTable } from '@kbn/scout';

type AppName = 'dashboard' | 'visualize' | 'map';

const APP_TEST_SUBJECT_PREFIX: Record<AppName, string> = {
  dashboard: 'dashboard',
  visualize: 'vis',
  map: 'map',
};

export class SavedObjectsListingPage {
  private readonly listingTable: ListingTable;

  constructor(private readonly page: ScoutPage) {
    this.listingTable = new ListingTable(page);
  }

  async waitForLoaded() {
    await this.listingTable.waitUntilTableIsLoaded();
  }

  async searchForItemWithName(name: string, { escape = true }: { escape?: boolean } = {}) {
    let filterValue = name;
    if (escape) {
      filterValue = filterValue
        .replace('-', ' ')
        // Keep parity with the FTR helper behavior.
        .replace(/ *\[[^)]*\] */g, '');
    }
    await this.listingTable.searchFor(filterValue);
  }

  async selectFilterTags(...tagNames: string[]) {
    await this.listingTable.selectFilterTags(...tagNames);
  }

  getItemLinks(appName: AppName): Locator {
    const testSubjPrefix = APP_TEST_SUBJECT_PREFIX[appName];
    return this.page.locator(`[data-test-subj^="${testSubjPrefix}ListingTitleLink-"]`);
  }

  async getAllItemNames(appName: AppName): Promise<string[]> {
    return this.getItemLinks(appName).allInnerTexts();
  }

  async clickItemLink(appName: AppName, name: string) {
    const testSubjPrefix = APP_TEST_SUBJECT_PREFIX[appName];
    await this.page.testSubj.click(
      `${testSubjPrefix}ListingTitleLink-${name.split(' ').join('-')}`
    );
  }
}
