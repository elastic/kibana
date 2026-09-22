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
    return this.page.testSubj
      .locator('chromeNextSearchModal')
      .locator('.euiSelectableTemplateSitewide__listItemTitle');
  }

  async navigateToHome() {
    await this.page.gotoApp('home');
  }

  async openSearch() {
    const modal = this.page.testSubj.locator('chromeNextSearchModal');
    if (await modal.isVisible()) {
      return;
    }
    await this.page.testSubj.click('chromeNextGlobalHeaderSearchButton');
    await modal.waitFor({ state: 'visible' });
  }

  async focus() {
    await this.openSearch();
    await this.page.testSubj.click('nav-search-input');
  }

  async blur() {
    await this.page.keyboard.press('Escape');
    await this.page.testSubj.locator('chromeNextSearchModal').waitFor({ state: 'hidden' });
  }

  async searchFor(term: string, { clear = true }: { clear?: boolean } = {}) {
    await this.openSearch();
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
    return await this.page.testSubj.locator('chromeNextSearchModal').isVisible();
  }

  async clickOnOption(index: number) {
    const options = await this.page.testSubj.locator('nav-search-option').all();
    await options[index].click();
  }

  async scrollToResult(label: string): Promise<Locator> {
    const item = this.resultLabels.filter({ hasText: label });
    const list = this.page.testSubj
      .locator('chromeNextSearchModal')
      .locator('.euiSelectableList__list');

    // EuiSelectable virtualizes rows, so off-screen labels are not in the DOM.
    // scrollIntoViewIfNeeded is a no-op until this windowing container scrolls.
    await list.waitFor({ state: 'visible' });
    await list.evaluate((element) => {
      element.scrollTop = 0;
    });

    const deadline = Date.now() + 15_000;
    while ((await item.count()) === 0 && Date.now() < deadline) {
      const canScrollFurther = await list.evaluate((element) => {
        const previousTop = element.scrollTop;
        element.scrollTop += element.clientHeight;
        return element.scrollTop !== previousTop;
      });
      if (!canScrollFurther) {
        break;
      }
    }

    return item;
  }

  async isNoResultsPlaceholderDisplayed() {
    await this.page.getByRole('status').getByTestId('nav-search-no-results').waitFor({
      state: 'visible',
      timeout: 5000,
    });
    return true;
  }
}
