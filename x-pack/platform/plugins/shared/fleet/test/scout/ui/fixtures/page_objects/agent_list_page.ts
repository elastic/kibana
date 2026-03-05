/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { FLEET_AGENT_LIST_PAGE } from '../../common/selectors';

export class AgentListPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('fleet');
    await this.page.testSubj
      .locator(FLEET_AGENT_LIST_PAGE.TABLE)
      .waitFor({ state: 'visible', timeout: 20_000 });
  }

  getTable() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TABLE);
  }

  getQueryInput() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.QUERY_INPUT);
  }

  getStatusFilter() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.STATUS_FILTER);
  }

  getTagsFilter() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.TAGS_FILTER);
  }

  getPolicyFilter() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.POLICY_FILTER);
  }

  getShowUpgradeable() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.SHOW_UPGRADEABLE);
  }

  getCheckboxSelectAll() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.CHECKBOX_SELECT_ALL);
  }

  getBulkActionsButton() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS_BUTTON);
  }

  getActivityButton() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.ACTIVITY_BUTTON);
  }

  getAddRemoveTagInput() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS.ADD_REMOVE_TAG_INPUT);
  }

  getActivityFlyoutCloseButton() {
    return this.page.testSubj.locator(FLEET_AGENT_LIST_PAGE.ACTIVITY_FLYOUT.CLOSE_BUTTON);
  }

  async selectPolicyFilterOption(optionText: string) {
    await this.getPolicyFilter().click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async selectStatusFilterOption(optionText: string) {
    await this.getStatusFilter().click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async selectTagsFilterOption(optionText: string) {
    await this.getTagsFilter().click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async clickBulkAction(buttonText: string) {
    await this.getBulkActionsButton()
      .locator('..')
      .getByRole('button', { name: buttonText })
      .click();
  }

  async clickSubmenuAction(buttonText: string) {
    await this.page.getByRole('menuitem', { name: buttonText }).click();
  }
}
