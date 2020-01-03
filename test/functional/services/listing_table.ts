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

import { FtrProviderContext } from '../ftr_provider_context';

export function ListingTableProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const { common, header } = getPageObjects(['common', 'header']);

  class ListingTable {
    public async getSearchFilter() {
      const searchFilter = await find.allByCssSelector('.euiFieldSearch');
      return searchFilter[0];
    }

    public async clearFilter() {
      const searchFilter = await this.getSearchFilter();
      await searchFilter.clearValue();
      await searchFilter.click();
    }

    public async getAllVisualizationNamesOnCurrentPage(): Promise<string[]> {
      const visualizationNames = [];
      const links = await find.allByCssSelector('.kuiLink');
      for (let i = 0; i < links.length; i++) {
        visualizationNames.push(await links[i].getVisibleText());
      }
      log.debug(`Found ${visualizationNames.length} visualizations on current page`);
      return visualizationNames;
    }

    public async getItemsCount(appName: 'visualize' | 'dashboard'): Promise<number> {
      const prefixMap = { visualize: 'vis', dashboard: 'dashboard' };
      const elements = await find.allByCssSelector(
        `[data-test-subj^="${prefixMap[appName]}ListingTitleLink"]`
      );
      return elements.length;
    }

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

    public async clickDeleteSelected() {
      await testSubjects.click('deleteSelectedItems');
    }

    public async checkListingSelectAllCheckbox() {
      const element = await testSubjects.find('checkboxSelectAll');
      const isSelected = await element.isSelected();
      if (!isSelected) {
        log.debug(`checking checkbox "checkboxSelectAll"`);
        await testSubjects.click('checkboxSelectAll');
      }
    }

    public async getAllVisualizationNames(): Promise<string[]> {
      log.debug('ListingTable.getAllVisualizationNames');
      let morePages = true;
      let visualizationNames: string[] = [];
      while (morePages) {
        visualizationNames = visualizationNames.concat(
          await this.getAllVisualizationNamesOnCurrentPage()
        );
        morePages = !((await testSubjects.getAttribute('pagerNextButton', 'disabled')) === 'true');
        if (morePages) {
          await testSubjects.click('pagerNextButton');
          await header.waitUntilLoadingHasFinished();
        }
      }
      return visualizationNames;
    }
  }

  return new ListingTable();
}
