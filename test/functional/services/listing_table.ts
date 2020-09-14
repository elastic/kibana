/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function ListingTableProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const { common, header } = getPageObjects(['common', 'header']);
  const prefixMap = { visualize: 'vis', dashboard: 'dashboard' };

  /**
   * This class provides functions for dashboard and visualize landing pages
   */
  class ListingTable {
    private async getSearchFilter() {
      const searchFilter = await find.allByCssSelector('.euiFieldSearch');
      return searchFilter[0];
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
      const links = await find.allByCssSelector('.kuiLink');
      for (let i = 0; i < links.length; i++) {
        visualizationNames.push(await links[i].getVisibleText());
      }
      log.debug(`Found ${visualizationNames.length} visualizations on current page`);
      return visualizationNames;
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
        morePages = !((await testSubjects.getAttribute('pagerNextButton', 'disabled')) === 'true');
        if (morePages) {
          await testSubjects.click('pagerNextButton');
          await header.waitUntilLoadingHasFinished();
        }
      }
      return visualizationNames;
    }

    /**
     * Returns items count on landing page
     * @param appName 'visualize' | 'dashboard'
     */
    public async expectItemsCount(appName: 'visualize' | 'dashboard', count: number) {
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
    public async searchForItemWithName(name: string) {
      log.debug(`searchForItemWithName: ${name}`);

      await retry.try(async () => {
        const searchFilter = await this.getSearchFilter();
        await searchFilter.clearValue();
        await searchFilter.click();
        // Note: this replacement of - to space is to preserve original logic but I'm not sure why or if it's needed.
        await searchFilter.type(name.replace('-', ' '));
        await common.pressEnterKey();
      });

      await header.waitUntilLoadingHasFinished();
    }

    /**
     * Searches for item on Landing page and retruns items count that match `ListingTitleLink-${name}` pattern
     * @param appName 'visualize' | 'dashboard'
     * @param name item name
     */
    public async searchAndExpectItemsCount(
      appName: 'visualize' | 'dashboard',
      name: string,
      count: number
    ) {
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
     * @param appName 'dashboard' | 'visualize'
     * @param name item name
     */
    public async clickItemLink(appName: 'dashboard' | 'visualize', name: string) {
      await testSubjects.click(`${appName}ListingTitleLink-${name.split(' ').join('-')}`);
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
  }

  return new ListingTable();
}
