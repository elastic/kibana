/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

type AppName = 'visualize' | 'dashboard' | 'map';

export function ListingTableProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const { common, header } = getPageObjects(['common', 'header']);
  const prefixMap = { visualize: 'vis', dashboard: 'dashboard', map: 'map' };

  class ListingTable {
    private async getSearchFilter() {
      return await testSubjects.find('tableListSearchBox');
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
      const links = await find.allByCssSelector('.euiTableRow .euiLink');
      for (let i = 0; i < links.length; i++) {
        visualizationNames.push(await links[i].getVisibleText());
      }
      log.debug(`Found ${visualizationNames.length} visualizations on current page`);
      return visualizationNames;
    }

    public async waitUntilTableIsLoaded() {
      return retry.try(async () => {
        const isLoaded = await find.existsByDisplayedByCssSelector(
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
      log.debug('ListingTable.getAllItemsNames');
      let morePages = true;
      let visualizationNames: string[] = [];
      while (morePages) {
        visualizationNames = visualizationNames.concat(await this.getAllItemsNamesOnCurrentPage());
        morePages = !(
          (await testSubjects.getAttribute('pagination-button-next', 'disabled')) === 'true'
        );
        if (morePages) {
          await testSubjects.click('pagerNextButton');
          await header.waitUntilLoadingHasFinished();
        }
      }
      return visualizationNames;
    }

    /**
     * Returns items count on landing page
     */
    public async expectItemsCount(appName: AppName, count: number) {
      await retry.try(async () => {
        const elements = await find.allByCssSelector(
          `[data-test-subj^="${prefixMap[appName]}ListingTitleLink"]`
        );
        expect(elements.length).to.equal(count);
      });
    }

    /**
     * Types name into search field on Landing page and waits till search completed
     * @param name item name
     */
    public async searchForItemWithName(name: string, { escape = true }: { escape?: boolean } = {}) {
      log.debug(`searchForItemWithName: ${name}`);

      await retry.try(async () => {
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
        await common.pressEnterKey();
      });

      await header.waitUntilLoadingHasFinished();
    }

    /**
     * Searches for item on Landing page and retruns items count that match `ListingTitleLink-${name}` pattern
     */
    public async searchAndExpectItemsCount(appName: AppName, name: string, count: number) {
      await this.searchForItemWithName(name);
      await retry.try(async () => {
        const links = await testSubjects.findAll(
          `${prefixMap[appName]}ListingTitleLink-${name.replace(/ /g, '-')}`
        );
        expect(links.length).to.equal(count);
      });
    }

    public async clickDeleteSelected() {
      await testSubjects.click('deleteSelectedItems');
    }

    public async clickItemCheckbox(id: string) {
      await testSubjects.click(`checkboxSelectRow-${id}`);
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
      await common.clickConfirmOnModal();
    }

    /**
     * Clicks item on Landing page by link name if it is present
     */
    public async clickItemLink(appName: AppName, name: string) {
      await testSubjects.click(
        `${prefixMap[appName]}ListingTitleLink-${name.split(' ').join('-')}`
      );
    }

    /**
     * Checks 'SelectAll' checkbox on
     */
    public async checkListingSelectAllCheckbox() {
      const element = await testSubjects.find('checkboxSelectAll');
      const isSelected = await element.isSelected();
      if (!isSelected) {
        log.debug(`checking checkbox "checkboxSelectAll"`);
        await testSubjects.click('checkboxSelectAll');
      }
    }

    /**
     * Clicks NewItem button on Landing page
     * @param promptBtnTestSubj testSubj locator for Prompt button
     */
    public async clickNewButton(promptBtnTestSubj: string): Promise<void> {
      await retry.tryForTime(20000, async () => {
        // newItemButton button is only visible when there are items in the listing table is displayed.
        const isnNewItemButtonPresent = await testSubjects.exists('newItemButton', {
          timeout: 10000,
        });
        if (isnNewItemButtonPresent) {
          await testSubjects.click('newItemButton');
        } else {
          // no items exist, click createPromptButton to create new dashboard/visualization
          await testSubjects.click(promptBtnTestSubj);
        }
      });
    }

    public async onListingPage(appName: AppName) {
      return await testSubjects.exists(`${appName}LandingPage`, {
        timeout: 5000,
      });
    }
  }

  return new ListingTable();
}
