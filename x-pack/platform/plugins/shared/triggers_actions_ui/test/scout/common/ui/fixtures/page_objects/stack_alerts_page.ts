/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { STACK_ALERTS_PAGE_PATH, STACK_ALERTS_PAGE_TEST_SUBJECTS } from '../constants';

const {
  TABLE_LOADED,
  TABLE_LOADING,
  ROW_ACTIONS_MORE,
  ACTIONS_MENU,
  RULE_NAME_LINK,
  RULE_NAME_TEXT,
  FLYOUT_OVERVIEW_PANEL,
  ROW_EXPAND,
  ALERT_FLYOUT,
} = STACK_ALERTS_PAGE_TEST_SUBJECTS;

export class StackAlertsPage {
  constructor(private readonly page: ScoutPage) {}

  public get tableLoaded() {
    return this.page.testSubj.locator(TABLE_LOADED);
  }

  public get tableLoading() {
    return this.page.testSubj.locator(TABLE_LOADING);
  }

  public get flyoutOverviewPanel() {
    return this.page.testSubj.locator(FLYOUT_OVERVIEW_PANEL);
  }

  public ruleNameLinkInRow(rowIndex = 0) {
    return this.page.locator(
      `[data-gridcell-row-index="${rowIndex}"] [data-test-subj="${RULE_NAME_LINK}"]`
    );
  }

  public ruleNameTextInRow(rowIndex = 0) {
    return this.page.locator(
      `[data-gridcell-row-index="${rowIndex}"] [data-test-subj="${RULE_NAME_TEXT}"]`
    );
  }

  public flyoutRuleNameLink() {
    return this.page.locator(
      `[data-test-subj="${FLYOUT_OVERVIEW_PANEL}"] [data-test-subj="${RULE_NAME_LINK}"]`
    );
  }

  public flyoutRuleNameText() {
    return this.page.locator(
      `[data-test-subj="${FLYOUT_OVERVIEW_PANEL}"] [data-test-subj="${RULE_NAME_TEXT}"]`
    );
  }

  async gotoLoaded(kbnUrl: KibanaUrl) {
    await expect(async () => {
      await this.page.goto(kbnUrl.get(STACK_ALERTS_PAGE_PATH), {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await this.tableLoading.waitFor({ state: 'hidden', timeout: 30_000 });
      await this.tableLoaded.waitFor({ state: 'visible', timeout: 30_000 });
    }).toPass({ timeout: 90_000, intervals: [3_000] });
  }

  async openAlertDetailsFlyout(rowIndex = 0) {
    await this.page
      .locator(`[data-gridcell-row-index="${rowIndex}"] [data-test-subj="${ROW_EXPAND}"]`)
      .click();
    await this.page.testSubj.locator(ALERT_FLYOUT).waitFor({ state: 'visible', timeout: 10_000 });
    await this.flyoutOverviewPanel.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async openRowActionsMenu(kbnUrl: KibanaUrl) {
    await expect(async () => {
      await this.page.goto(kbnUrl.get(STACK_ALERTS_PAGE_PATH), {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await this.tableLoading.waitFor({ state: 'hidden', timeout: 30_000 });
      await this.tableLoaded.waitFor({ state: 'visible', timeout: 30_000 });
      await this.page
        .locator(`[data-gridcell-row-index="0"] [data-test-subj="${ROW_ACTIONS_MORE}"]`)
        .click();
      await this.page.testSubj.locator(ACTIONS_MENU).waitFor({ state: 'visible', timeout: 10_000 });
    }).toPass({ timeout: 90_000, intervals: [3_000] });
  }

  async gotoAlertForRule(kbnUrl: KibanaUrl, ruleUuid: string) {
    const searchBarParams = encodeRison({
      kuery: `kibana.alert.rule.uuid: "${ruleUuid}"`,
      rangeFrom: 'now-1y',
      rangeTo: 'now',
    });
    const url = kbnUrl.get(
      `${STACK_ALERTS_PAGE_PATH}?searchBarParams=${encodeURIComponent(searchBarParams)}`
    );

    await expect(async () => {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await this.tableLoading.waitFor({ state: 'hidden', timeout: 30_000 });
      await this.tableLoaded.waitFor({ state: 'visible', timeout: 30_000 });
      await expect(this.page.locator('[data-gridcell-row-index="1"]')).toHaveCount(0);
    }).toPass({ timeout: 90_000, intervals: [3_000] });
  }
}
