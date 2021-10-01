/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

type AppName = keyof typeof PREFIX_MAP;
const PREFIX_MAP = { visualize: 'vis', dashboard: 'dashboard', map: 'map' };

export class ListingTableService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');

  private async getSearchFilter() {
    return await this.testSubjects.find('tableListSearchBox');
  }

  /**
   * Returns search input value on landing page
   */
  public async getSearchFilterValue() {
    const searchFilter = await this.getSearchFilter();
    return await searchFilter.getAttribute('value');
  }

  /**
   * Clears search input on landing page
   */
  public async clearSearchFilter() {
    const searchFilter = await this.getSearchFilter();
    await searchFilter.clearValue();
    await searchFilter.click();
  }

  private async getAllItemsNamesOnCurrentPage(): Promise<string[]> {
    const visualizationNames = [];
    const links = await this.find.allByCssSelector('.euiTableRow .euiLink');
    for (let i = 0; i < links.length; i++) {
      visualizationNames.push(await links[i].getVisibleText());
    }
    this.log.debug(`Found ${visualizationNames.length} visualizations on current page`);
    return visualizationNames;
  }

  public async waitUntilTableIsLoaded() {
    return this.retry.try(async () => {
      const isLoaded = await this.find.existsByDisplayedByCssSelector(
        '[data-test-subj="itemsInMemTable"]:not(.euiBasicTable-loading)'
      );

      if (isLoaded) {
        return true;
      } else {
        throw new Error('Waiting');
      }
    });
  }

  /**
   * Navigates through all pages on Landing page and returns array of items names
   */
  public async getAllItemsNames(): Promise<string[]> {
    this.log.debug('ListingTable.getAllItemsNames');
    let morePages = true;
    let visualizationNames: string[] = [];
    while (morePages) {
      visualizationNames = visualizationNames.concat(await this.getAllItemsNamesOnCurrentPage());
      morePages = !(
        (await this.testSubjects.getAttribute('pagination-button-next', 'disabled')) === 'true'
      );
      if (morePages) {
        await this.testSubjects.click('pagerNextButton');
        await this.header.waitUntilLoadingHasFinished();
      }
    }
    return visualizationNames;
  }

  /**
   * Returns items count on landing page
   */
  public async expectItemsCount(appName: AppName, count: number) {
    await this.retry.try(async () => {
      const elements = await this.find.allByCssSelector(
        `[data-test-subj^="${PREFIX_MAP[appName]}ListingTitleLink"]`
      );
      expect(elements.length).to.equal(count);
    });
  }

  /**
   * Types name into search field on Landing page and waits till search completed
   * @param name item name
   */
  public async searchForItemWithName(name: string, { escape = true }: { escape?: boolean } = {}) {
    this.log.debug(`searchForItemWithName: ${name}`);

    await this.retry.try(async () => {
      const searchFilter = await this.getSearchFilter();
      await searchFilter.clearValue();
      await searchFilter.click();

      if (escape) {
        name = name
          // Note: this replacement of - to space is to preserve original logic but I'm not sure why or if it's needed.
          .replace('-', ' ')
          // Remove `[*]` from search as it is not supported by EUI Query's syntax.
          .replace(/ *\[[^)]*\] */g, '');
      }

      await searchFilter.type(name);
      await this.common.pressEnterKey();
    });

    await this.header.waitUntilLoadingHasFinished();
  }

  /**
   * Searches for item on Landing page and retruns items count that match `ListingTitleLink-${name}` pattern
   */
  public async searchAndExpectItemsCount(appName: AppName, name: string, count: number) {
    await this.searchForItemWithName(name);
    await this.retry.try(async () => {
      const links = await this.testSubjects.findAll(
        `${PREFIX_MAP[appName]}ListingTitleLink-${name.replace(/ /g, '-')}`
      );
      expect(links.length).to.equal(count);
    });
  }

  public async clickDeleteSelected() {
    await this.testSubjects.click('deleteSelectedItems');
  }

  public async clickItemCheckbox(id: string) {
    await this.testSubjects.click(`checkboxSelectRow-${id}`);
  }

  /**
   * Searches for item by name, selects checbox and deletes it
   * @param name item name
   * @param id row id
   */
  public async deleteItem(name: string, id: string) {
    await this.searchForItemWithName(name);
    await this.clickItemCheckbox(id);
    await this.clickDeleteSelected();
    await this.common.clickConfirmOnModal();
  }

  /**
   * Clicks item on Landing page by link name if it is present
   */
  public async clickItemLink(appName: AppName, name: string) {
    await this.testSubjects.click(
      `${PREFIX_MAP[appName]}ListingTitleLink-${name.split(' ').join('-')}`
    );
  }

  /**
   * Checks 'SelectAll' checkbox on
   */
  public async checkListingSelectAllCheckbox() {
    const element = await this.testSubjects.find('checkboxSelectAll');
    const isSelected = await element.isSelected();
    if (!isSelected) {
      this.log.debug(`checking checkbox "checkboxSelectAll"`);
      await this.testSubjects.click('checkboxSelectAll');
    }
  }

  /**
   * Clicks NewItem button on Landing page
   * @param promptBtnTestSubj testSubj locator for Prompt button
   */
  public async clickNewButton(promptBtnTestSubj: string): Promise<void> {
    await this.retry.tryForTime(20000, async () => {
      // newItemButton button is only visible when there are items in the listing table is displayed.
      const isnNewItemButtonPresent = await this.testSubjects.exists('newItemButton', {
        timeout: 10000,
      });
      if (isnNewItemButtonPresent) {
        await this.testSubjects.click('newItemButton');
      } else {
        // no items exist, click createPromptButton to create new dashboard/visualization
        await this.testSubjects.click(promptBtnTestSubj);
      }
    });
  }

  public async onListingPage(appName: AppName) {
    return await this.testSubjects.exists(`${appName}LandingPage`, {
      timeout: 5000,
    });
  }
}
