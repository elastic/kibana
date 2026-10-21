/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridObject, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import {
  ALERTS_TABLE_EXPAND_COLUMN_ID,
  BIGGER_TIMEOUT,
  RULE_DETAILS_APP_PATH,
  RULE_DETAILS_TEST_SUBJECTS,
  SHORTER_TIMEOUT,
} from '../constants';

export class RuleDetailsPage {
  public readonly alertsTable: EuiDataGridObject;

  constructor(private readonly page: ScoutPage) {
    this.alertsTable = this.page.components.dataGrid('alertsTableIsLoaded');
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

  async expectAlertsTabLoaded() {
    await expect(this.alertsSearchBarRow).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  async expectAlertsTableEmptyState() {
    await expect(this.alertsTableEmptyState).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  async submitAlertsQuery() {
    await this.alertsQuerySubmitButton.click();
  }

  public get alertFlyout() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ALERT_FLYOUT);
  }

  public get alertFlyoutFieldsTablePanel() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.FLYOUT_TABLE_TAB_PANEL);
  }

  /**
   * Opens the alert details flyout for the row at `rowIndex` on its fields table tab,
   * which lists every raw alert field regardless of which grid columns are rendered.
   */
  async openAlertFieldsTable(rowIndex = 0) {
    await this.alertsTable
      .cell(rowIndex, ALERTS_TABLE_EXPAND_COLUMN_ID)
      .getByTestId(RULE_DETAILS_TEST_SUBJECTS.ROW_EXPAND)
      .click();
    await this.alertFlyout.waitFor({ state: 'visible' });
    await this.page.testSubj.click(RULE_DETAILS_TEST_SUBJECTS.FLYOUT_TABLE_TAB);
    await this.alertFlyoutFieldsTablePanel.waitFor({ state: 'visible' });
  }

  async filterAlertFieldsTable(query: string) {
    await this.page.testSubj.fill(
      RULE_DETAILS_TEST_SUBJECTS.FLYOUT_FIELDS_TABLE_FILTER_INPUT,
      query
    );
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
