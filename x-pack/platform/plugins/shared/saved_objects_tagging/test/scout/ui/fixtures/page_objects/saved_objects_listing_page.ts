/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

type AppName = 'dashboard' | 'visualize' | 'map';

const APP_TEST_SUBJECT_PREFIX: Record<AppName, string> = {
  dashboard: 'dashboard',
  visualize: 'vis',
  map: 'map',
};

const toTestSubjFriendly = (value: string) => value.replace(' ', '_');

export class SavedObjectsListingPage {
  constructor(private readonly page: ScoutPage) {}

  async waitForLoaded() {
    await this.page.testSubj.locator('listingTable-isLoaded').waitFor({ state: 'visible' });
  }

  async searchForItemWithName(name: string, { escape = true }: { escape?: boolean } = {}) {
    const searchFilter = this.page.testSubj.locator('tableListSearchBox');
    let filterValue = name;

    if (escape) {
      filterValue = filterValue
        .replace('-', ' ')
        // Keep parity with the FTR helper behavior.
        .replace(/ *\[[^)]*\] */g, '');
    }

    await searchFilter.fill(filterValue);
    await this.page.keyboard.press('Enter');
    await this.waitForLoaded();
  }

  async selectFilterTags(...tagNames: string[]) {
    await this.page.testSubj.click('tagFilterPopoverButton');
    for (const tagName of tagNames) {
      await this.page.testSubj.click(`tag-searchbar-option-${toTestSubjFriendly(tagName)}`);
    }
    await this.page.testSubj.click('tableListSearchBox');
    await this.waitForLoaded();
  }

  async expectItemsCount(appName: AppName, count: number) {
    const testSubjPrefix = APP_TEST_SUBJECT_PREFIX[appName];
    await expect(
      this.page.locator(`[data-test-subj^="${testSubjPrefix}ListingTitleLink-"]`)
    ).toHaveCount(count);
  }

  async getAllItemNames(appName: AppName) {
    const testSubjPrefix = APP_TEST_SUBJECT_PREFIX[appName];
    return this.page
      .locator(`[data-test-subj^="${testSubjPrefix}ListingTitleLink-"]`)
      .allInnerTexts();
  }

  async clickItemLink(appName: AppName, name: string) {
    const testSubjPrefix = APP_TEST_SUBJECT_PREFIX[appName];
    await this.page.testSubj.click(
      `${testSubjPrefix}ListingTitleLink-${name.split(' ').join('-')}`
    );
  }
}
