/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class GlobalSearch {
  constructor(private readonly page: ScoutPage) {}

  public get resultLabels(): Locator {
    return this.page
      .locator('.navSearch__panel')
      .locator('.euiSelectableTemplateSitewide__listItemTitle');
  }

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

  async searchFor(term: string, { clear = true }: { clear?: boolean } = {}) {
    if (clear) {
      await this.clearField();
    }
    await this.page.testSubj.fill('nav-search-input', term);
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

  async isNoResultsPlaceholderDisplayed() {
    await this.page.getByRole('status').getByTestId('nav-search-no-results').waitFor({
      state: 'visible',
      timeout: 5000,
    });
    return true;
  }
}
