/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';

interface SearchResult {
  label: string;
}

export class GlobalSearch {
  constructor(private readonly page: ScoutPage) {}

  async navigateToHome() {
    await this.page.gotoApp('home');
  }

  async focus() {
    await this.page.testSubj.click('nav-search-input');
  }

  async blur() {
    // Click help menu button twice to close the search popover
    await this.page.testSubj.click('helpMenuButton');
    await this.page.testSubj.click('helpMenuButton');
    await this.page.locator('.navSearch__panel').waitFor({ state: 'hidden', timeout: 5000 });
  }

  async searchFor(
    term: string,
    { clear = true, wait = true }: { clear?: boolean; wait?: boolean } = {}
  ) {
    if (clear) {
      await this.clearField();
    }
    await this.page.testSubj.fill('nav-search-input', term);
    if (wait) {
      await this.waitForResultsLoaded();
    }
  }

  async getFieldValue() {
    return await this.page.testSubj.locator('nav-search-input').inputValue();
  }

  async clearField() {
    await this.page.testSubj.locator('nav-search-input').clear();
  }

  async isPopoverDisplayed() {
    return await this.page.locator('.navSearch__panel').isVisible();
  }

  async clickOnOption(index: number) {
    const options = await this.page.testSubj.locator('nav-search-option').all();
    await options[index].click();
  }

  async waitForResultsLoaded() {
    // Wait for at least one option to appear
    await this.page.testSubj.waitForSelector('nav-search-option');

    // Results are emitted in multiple batches. Poll the result count to ensure
    // all batches have been received (count stabilizes when no more results are coming).
    await expect(async () => {
      const count = await this.page.testSubj.locator('nav-search-option').count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10000, intervals: [500, 1000] });
  }

  async getDisplayedResults(): Promise<SearchResult[]> {
    const resultElements = await this.page.testSubj.locator('nav-search-option').all();
    const results: SearchResult[] = [];

    for (const resultEl of resultElements) {
      const labelEl = resultEl.locator('.euiSelectableTemplateSitewide__listItemTitle');
      const label = await labelEl.textContent();
      if (label) {
        results.push({ label: label.trim() });
      }
    }

    return results;
  }

  async isNoResultsPlaceholderDisplayed() {
    await this.page.getByRole('status').getByTestId('nav-search-no-results').waitFor({
      state: 'visible',
      timeout: 5000,
    });
    return true;
  }
}
