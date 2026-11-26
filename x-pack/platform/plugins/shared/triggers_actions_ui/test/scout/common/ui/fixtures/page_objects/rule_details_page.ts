/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridWrapper, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import {
  BIGGER_TIMEOUT,
  RULE_DETAILS_APP_PATH,
  RULE_DETAILS_TEST_SUBJECTS,
  SHORTER_TIMEOUT,
} from '../constants';

export class RuleDetailsPage {
  public readonly alertsTable: EuiDataGridWrapper;

  constructor(private readonly page: ScoutPage) {
    this.alertsTable = new EuiDataGridWrapper(this.page, 'alertsTableIsLoaded');
  }

  async gotoById(ruleId: string) {
    await this.page.gotoApp(`${RULE_DETAILS_APP_PATH}${getRuleDetailsRoute(ruleId)}`);
    await expect(this.ruleDetailsTitle).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  public get ruleDetailsTitle() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS_TITLE);
  }

  public get ruleName() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_NAME);
  }

  public get alertsSearchBarRow() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ALERTS_SEARCH_BAR_ROW);
  }

  public get alertsQueryInput() {
    return this.page.testSubj.locator('queryInput');
  }

  public get alertsQuerySubmitButton() {
    return this.page.testSubj.locator('querySubmitButton');
  }

  public get alertsTableEmptyState() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ALERTS_TABLE_EMPTY_STATE);
  }

  public get alertSummaryTotalCount() {
    return this.page.testSubj.locator('totalAlertCount');
  }

  public get alertSummaryActiveCount() {
    return this.page.testSubj.locator('activeAlertCount');
  }

  async expectAlertsTabLoaded() {
    await expect(this.alertsSearchBarRow).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  async expectAlertsTableEmptyState() {
    await expect(this.alertsTableEmptyState).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  async filterAlertsByKql(query: string) {
    await this.alertsQueryInput.fill(query);
    await this.alertsQuerySubmitButton.click();
  }

  /**
   * Opens the first alert row's actions menu and clicks Snooze. Callers assert the
   * inline snooze panel visibility in the spec (Playwright clicks auto-wait).
   */
  async openAlertSnoozePanel() {
    await this.page.testSubj.click('alertsTableRowActionMore');
    await this.page.testSubj.click('snooze-alert-action-snooze');
  }

  /**
   * Opens the first alert row's actions menu and clicks Unsnooze.
   */
  async unsnoozeAlert() {
    await this.page.testSubj.click('alertsTableRowActionMore');
    await this.page.testSubj.click('snooze-alert-action-unsnooze');
  }

  /**
   * Switches the open snooze panel to the "Condition based" tab.
   */
  async openConditionBasedSnoozeTab() {
    await this.page.testSubj.locator('alertSnoozeTabs').getByText('Condition based').click();
  }

  /**
   * Adds a `severity_equals` data condition at position `index` (1-based, matching
   * the `dc-<index>` test subjects) and confirms it. Pass `value` to override the
   * default severity.
   */
  async addSeverityDataCondition(index: number, value?: string) {
    await this.page.testSubj.click('addDataCondition');
    await this.page.testSubj
      .locator(`dataConditionType-dc-${index}`)
      .selectOption('severity_equals');
    if (value) {
      await this.page.testSubj.locator(`dataConditionValue-dc-${index}`).selectOption(value);
    }
    await this.page.testSubj.click(`confirmDataCondition-dc-${index}`);
  }

  async applySnooze() {
    await this.page.testSubj.click('alertSnoozeApplyButton');
  }
}
