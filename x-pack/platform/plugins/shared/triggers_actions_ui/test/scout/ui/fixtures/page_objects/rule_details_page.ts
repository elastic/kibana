/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridWrapper, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { BIGGER_TIMEOUT, RULE_DETAILS_TEST_SUBJECTS, SHORTER_TIMEOUT } from '../constants';

export class RuleDetailsPage {
  public readonly alertsTable: EuiDataGridWrapper;

  constructor(private readonly page: ScoutPage) {
    this.alertsTable = new EuiDataGridWrapper(this.page, 'alertsTableIsLoaded');
  }

  /**
   * Navigate directly to the rule details page for a given rule id using the unified rules app.
   */
  async gotoById(ruleId: string) {
    await this.page.gotoApp(`rules/rule/${ruleId}`);
    await expect(this.ruleDetailsTitle).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  public get ruleDetailsTitle() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS_TITLE);
  }

  public get ruleName() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_NAME);
  }

  public get ruleType() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_TYPE);
  }

  public get ruleStatusPanel() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_STATUS_PANEL);
  }

  public get ruleDefinition() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DEFINITION);
  }

  // ---- Alerts tab ----------------------------------------------------------

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
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.TOTAL_ALERT_COUNT);
  }

  public get alertSummaryActiveCount() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ACTIVE_ALERT_COUNT);
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

  // ---- Alert summary widget -----------------------------------------------

  public get alertSummaryWidget() {
    const page = this.page;
    return {
      get compact() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ALERT_SUMMARY_WIDGET_COMPACT);
      },
      get activeAlerts() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ACTIVE_ALERT_COUNT);
      },
      get totalAlerts() {
        return page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.TOTAL_ALERT_COUNT);
      },
      async clickActiveAlerts() {
        await this.activeAlerts.click();
      },
      async clickTotalAlerts() {
        await this.totalAlerts.click();
      },
    };
  }

  async expectRuleDetailsPageLoaded() {
    await expect(this.ruleDetailsTitle).toBeVisible({ timeout: BIGGER_TIMEOUT });
    await expect(this.ruleName).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  // ---- Actions popover -----------------------------------------------------

  public get actionsButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.ACTIONS_BUTTON);
  }

  public get editRuleButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.EDIT_RULE_BUTTON);
  }

  public get deleteRuleButton() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.DELETE_RULE_BUTTON);
  }

  async openActionsMenu() {
    await expect(this.actionsButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.actionsButton.click();
    await expect(this.editRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  async closeActionsMenu() {
    await this.actionsButton.click();
    await expect(this.editRuleButton).toBeHidden({ timeout: SHORTER_TIMEOUT });
  }

  // ---- Rule edit form ------------------------------------------------------

  public get ruleNameInput() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.RULE_DETAILS_NAME_INPUT);
  }

  public get dashboardsSelector() {
    return this.page.testSubj.locator(RULE_DETAILS_TEST_SUBJECTS.DASHBOARDS_SELECTOR);
  }

  public get comboboxOptionsList() {
    return this.page.locator('[data-test-subj*="comboBoxOptionsList"]');
  }

  async openRuleEditForm() {
    await this.openActionsMenu();
    await this.editRuleButton.click();
    await expect(this.ruleNameInput).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }
}
