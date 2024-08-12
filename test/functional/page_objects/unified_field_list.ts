/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

type SidebarSectionName = 'meta' | 'empty' | 'available' | 'unmapped' | 'popular' | 'selected';

export class UnifiedFieldListPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly header = this.ctx.getPageObject('header');
  private readonly browser = this.ctx.getService('browser');

  public async findFieldByName(name: string) {
    const fieldSearch = await this.testSubjects.find('fieldListFiltersFieldSearch');
    await fieldSearch.type(name);
  }

  public async clearFieldSearchInput() {
    const fieldSearch = await this.testSubjects.find('fieldListFiltersFieldSearch');
    await fieldSearch.clearValue();
  }

  public async getAllFieldNames() {
    const sidebar = await this.testSubjects.find('fieldListGroupedFieldGroups');
    const $ = await sidebar.parseDomContent();
    return $('.kbnFieldButton__name')
      .toArray()
      .map((field) => $(field).text());
  }

  public async getSidebarAriaDescription(): Promise<string> {
    return (
      (await (
        await this.testSubjects.find('fieldListGrouped__ariaDescription')
      ).getAttribute('innerText')) ?? ''
    );
  }

  public async cleanSidebarLocalStorage(): Promise<void> {
    await this.browser.setLocalStorageItem('discover.unifiedFieldList.initiallyOpenSections', '{}');
  }

  public async waitUntilSidebarHasLoaded() {
    await this.retry.waitFor('sidebar is loaded', async () => {
      return (await this.getSidebarAriaDescription()).length > 0;
    });
  }

  public async waitUntilFieldlistHasCountOfFields(count: number) {
    await this.retry.waitFor('wait until fieldlist has updated number of fields', async () => {
      return (
        (await this.find.allByCssSelector('#fieldListGroupedAvailableFields .kbnFieldButton'))
          .length === count
      );
    });
  }

  public async doesSidebarShowFields() {
    return await this.testSubjects.exists('fieldListGroupedFieldGroups');
  }

  public getSidebarSectionSelector(
    sectionName: SidebarSectionName,
    asCSSSelector: boolean = false
  ) {
    const testSubj = `fieldListGrouped${sectionName[0].toUpperCase()}${sectionName.substring(
      1
    )}Fields`;
    if (!asCSSSelector) {
      return testSubj;
    }
    return `[data-test-subj="${testSubj}"]`;
  }

  public async getSidebarSectionFieldNames(sectionName: SidebarSectionName): Promise<string[]> {
    const elements = await this.find.allByCssSelector(
      `${this.getSidebarSectionSelector(sectionName, true)} li`
    );

    if (!elements?.length) {
      return [];
    }

    return Promise.all(
      elements.map(async (element) => (await element.getAttribute('data-attr-field')) ?? '')
    );
  }

  public async toggleSidebarSection(sectionName: SidebarSectionName) {
    return await this.find.clickByCssSelector(
      `${this.getSidebarSectionSelector(sectionName, true)} .euiAccordion__arrow`
    );
  }

  public async openSidebarSection(sectionName: SidebarSectionName) {
    const openedSectionSelector = `${this.getSidebarSectionSelector(
      sectionName,
      true
    )}.euiAccordion-isOpen`;

    if (await this.find.existsByCssSelector(openedSectionSelector)) {
      return;
    }

    await this.retry.waitFor(`${sectionName} fields section to open`, async () => {
      await this.toggleSidebarSection(sectionName);
      return await this.find.existsByCssSelector(openedSectionSelector);
    });
  }

  public async waitUntilFieldPopoverIsOpen() {
    await this.retry.waitFor('popover is open', async () => {
      return Boolean(await this.find.byCssSelector('[data-popover-open="true"]'));
    });
  }

  public async waitUntilFieldPopoverIsLoaded() {
    await this.retry.waitFor('popover is loaded', async () => {
      return !(await this.find.existsByCssSelector('[data-test-subj*="-statsLoading"]'));
    });
  }

  public async closeFieldPopover() {
    await this.browser.pressKeys(this.browser.keys.ESCAPE);
    await this.retry.waitFor('popover is closed', async () => {
      return !(await this.testSubjects.exists('fieldPopoverHeader_fieldDisplayName'));
    });
  }

  public async clickFieldListItem(field: string) {
    await this.testSubjects.moveMouseTo(`field-${field}`);
    await this.testSubjects.click(`field-${field}`);

    await this.waitUntilFieldPopoverIsOpen();
    // Wait until the field stats popover is opened and loaded before
    // hitting the edit button, otherwise the click may occur at the
    // exact time the field stats load, triggering a layout shift, and
    // will result in the "filter for" button being clicked instead of
    // the edit button, causing test flakiness
    await this.waitUntilFieldPopoverIsLoaded();
  }

  public async clickFieldListItemToggle(field: string) {
    await this.testSubjects.moveMouseTo(`field-${field}`);
    await this.testSubjects.click(`fieldToggle-${field}`);
  }

  public async pressEnterFieldListItemToggle(field: string) {
    await this.testSubjects.pressEnter(`field-${field}-showDetails`);
  }

  public async clickFieldListItemAdd(field: string) {
    await this.waitUntilSidebarHasLoaded();

    // a filter check may make sense here, but it should be properly handled to make
    // it work with the _score and _source fields as well
    if (await this.isFieldSelected(field)) {
      return;
    }
    if (['_score', '_id', '_index'].includes(field)) {
      await this.toggleSidebarSection('meta'); // expand Meta section
    }
    await this.clickFieldListItemToggle(field);
    await this.retry.waitFor('field is selected', async () => {
      return await this.isFieldSelected(field);
    });
  }

  public async isFieldSelected(field: string) {
    if (!(await this.testSubjects.exists('fieldListGroupedSelectedFields'))) {
      return false;
    }
    const selectedList = await this.testSubjects.find('fieldListGroupedSelectedFields');
    return await this.testSubjects.descendantExists(`field-${field}`, selectedList);
  }

  public async clickFieldListItemRemove(field: string) {
    await this.waitUntilSidebarHasLoaded();

    if (
      !(await this.testSubjects.exists('fieldListGroupedSelectedFields')) ||
      !(await this.isFieldSelected(field))
    ) {
      return;
    }

    await this.clickFieldListItemToggle(field);
  }

  public async clickFieldListItemVisualize(fieldName: string) {
    await this.waitUntilSidebarHasLoaded();

    const field = await this.testSubjects.find(`field-${fieldName}-showDetails`);
    const isActive = await field.elementHasClass('kbnFieldButton-isActive');

    if (!isActive) {
      // expand the field to show the "Visualize" button
      await field.click();
    }

    await this.waitUntilFieldPopoverIsOpen();
    const visualizeButtonTestSubject = `fieldVisualize-${fieldName}`;
    // wrap visualize button click in retry to ensure button is clicked and retry if button click is not registered
    await this.retry.try(async () => {
      await this.testSubjects.click(visualizeButtonTestSubject);
      await this.testSubjects.waitForDeleted(visualizeButtonTestSubject);
      await this.testSubjects.missingOrFail(visualizeButtonTestSubject);
    });
    await this.header.waitUntilLoadingHasFinished();
  }

  public async expectFieldListItemVisualize(field: string) {
    await this.testSubjects.existOrFail(`fieldVisualize-${field}`);
  }

  public async expectMissingFieldListItemVisualize(field: string) {
    await this.testSubjects.missingOrFail(`fieldVisualize-${field}`);
  }

  public async clickFieldListPlusFilter(field: string, value: string) {
    const plusFilterTestSubj = `plus-${field}-${value}`;
    if (!(await this.testSubjects.exists(plusFilterTestSubj))) {
      // field has to be open
      await this.clickFieldListItem(field);
    }
    // this.testSubjects.find doesn't handle spaces in the data-test-subj value
    await this.testSubjects.click(plusFilterTestSubj);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickFieldListMinusFilter(field: string, value: string) {
    // this method requires the field details to be open from clickFieldListItem()
    // this.testSubjects.find doesn't handle spaces in the data-test-subj value
    await this.testSubjects.click(`minus-${field}-${value}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickFieldListExistsFilter(field: string) {
    const existsFilterTestSubj = `discoverFieldListPanelAddExistFilter-${field}`;
    if (!(await this.testSubjects.exists(existsFilterTestSubj))) {
      // field has to be open
      await this.clickFieldListItem(field);
    }
    // this.testSubjects.find doesn't handle spaces in the data-test-subj value
    await this.testSubjects.click(existsFilterTestSubj);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async openSidebarFieldFilter() {
    await this.testSubjects.click('fieldListFiltersFieldTypeFilterToggle');
    await this.testSubjects.existOrFail('fieldListFiltersFieldTypeFilterOptions');
  }

  public async closeSidebarFieldFilter() {
    await this.testSubjects.click('fieldListFiltersFieldTypeFilterToggle');

    await this.retry.waitFor('sidebar filter closed', async () => {
      return !(await this.testSubjects.exists('fieldListFiltersFieldTypeFilterOptions'));
    });
  }

  public async getFieldStatsViewType(): Promise<
    | 'topValuesAndDistribution'
    | 'histogram'
    | 'topValues'
    | 'timeDistribution'
    | 'exampleValues'
    | 'unknown'
  > {
    if (await this.testSubjects.exists('unifiedFieldStats-buttonGroup')) {
      return 'topValuesAndDistribution';
    }

    if (await this.testSubjects.exists('unifiedFieldStats-timeDistribution')) {
      return 'timeDistribution';
    }

    if (await this.testSubjects.exists('unifiedFieldStats-histogram')) {
      return 'histogram';
    }

    if (await this.testSubjects.exists('unifiedFieldStats-topValueBuckets')) {
      return 'topValues';
    }

    if (await this.testSubjects.exists('unifiedFieldStats-exampleValueBuckets')) {
      return 'exampleValues';
    }

    return 'unknown';
  }

  public async getFieldStatsDocsCount() {
    return parseInt(
      (
        await this.testSubjects.getVisibleText('unifiedFieldStats-statsFooter-docsCount')
      ).replaceAll(',', ''),
      10
    );
  }

  public async getFieldStatsTopValueBucketsVisibleText() {
    return await this.testSubjects.getVisibleText('unifiedFieldStats-topValueBuckets');
  }

  public async getFieldStatsExampleBucketsVisibleText() {
    return await this.testSubjects.getVisibleText('unifiedFieldStats-exampleValueBuckets');
  }
}
