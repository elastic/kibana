/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class SavedObjectsFinderService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');

  public async toggleFilterPopover() {
    this.log.debug('SavedObjectsFinder.toggleFilter');
    const filtersHolder = await this.find.byClassName('euiSearchBar__filtersHolder');
    const filtersButton = await filtersHolder.findByCssSelector('button');
    await filtersButton.click();
  }

  public async toggleFilter(type: string) {
    this.log.debug(`SavedObjectsFinder.addToFilter(${type})`);
    await this.waitForListLoading();
    await this.toggleFilterPopover();
    const list = await this.testSubjects.find('euiSelectableList');
    const listItems = await list.findAllByCssSelector('li');
    for (let i = 0; i < listItems.length; i++) {
      const listItem = await listItems[i].findByClassName('euiSelectableListItem__text');
      const text = await listItem.getVisibleText();
      if (text.includes(type)) {
        await listItem.click();
        await this.toggleFilterPopover();
        break;
      }
    }
  }

  public async waitForFilter(type: string, expectCondition: string) {
    await this.toggleFilter(type);
    const itemList = await this.testSubjects.find('savedObjectsFinderTable');
    await this.retry.try(async () => {
      const embeddableListBody = await itemList.findByTagName('tbody');
      const embeddableRows = await embeddableListBody.findAllByCssSelector('tr');
      const { name } = await this.getRowAtIndex(embeddableRows, 0);
      expect(name.includes(expectCondition)).to.be(false);
    });
  }

  public async filterEmbeddableNames(name: string) {
    // The search input field may be disabled while the table is loading so wait for it
    await this.waitForListLoading();
    await this.testSubjects.setValue('savedObjectFinderSearchInput', name);
    await this.waitForListLoading();
  }

  public async getRowAtIndex(rows: WebElementWrapper[], rowIndex: number) {
    const cell = await rows[rowIndex].findByTestSubject('savedObjectFinderTitle');
    const button = await cell.findByTagName('button');
    const name = await button.getVisibleText();
    return { button, name };
  }

  private async waitForListLoading() {
    await this.testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
  }
}
