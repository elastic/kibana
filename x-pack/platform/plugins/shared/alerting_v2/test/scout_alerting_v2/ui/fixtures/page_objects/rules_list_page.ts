/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class RulesListPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('management/alertingV2/rules');
  }

  tagsFilterButton() {
    return this.page.testSubj.locator('rulesListTagsFilter');
  }

  tagsFilterOption(tag: string) {
    return this.page.testSubj.locator(`rulesListTagsFilterOption-${tag}`);
  }

  rowCheckbox(ruleId: string) {
    return this.page.testSubj.locator(`checkboxSelectRow-${ruleId}`);
  }

  selectAllRulesButton() {
    return this.page.testSubj.locator('selectAllRulesButton');
  }

  bulkActionsButton() {
    return this.page.testSubj.locator('bulkActionsButton');
  }

  bulkDisableMenuItem() {
    return this.page.testSubj.locator('bulkDisableRules');
  }

  rulesListTable() {
    return this.page.testSubj.locator('rulesListTable');
  }

  /**
   * Opens the Tags filter popover, selects one tag, and closes the popover.
   */
  async filterBySingleTag(tag: string) {
    await this.tagsFilterButton().click();
    await this.tagsFilterOption(tag).waitFor({ state: 'visible', timeout: 60_000 });
    await this.tagsFilterOption(tag).click();
    await this.tagsFilterButton().click();
  }
}
