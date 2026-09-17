/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

export class ExecutionHistoryPage {
  public readonly emptyPrompt: Locator;
  public readonly retryButton: Locator;
  public readonly rulesTab: Locator;
  public readonly actionPoliciesTab: Locator;
  public readonly searchBar: Locator;
  public readonly policiesTable: Locator;
  public readonly policyDetailsFlyout: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.emptyPrompt = this.page.testSubj.locator('ruleExecutionHistoryEmptyPrompt');
    this.retryButton = this.page.testSubj.locator('executionHistoryRetryButton');
    this.rulesTab = this.page.testSubj.locator('executionHistoryRulesTab');
    this.actionPoliciesTab = this.page.testSubj.locator('executionHistoryPoliciesTab');
    this.searchBar = this.page.testSubj.locator('executionHistorySearchBar');
    this.policiesTable = this.page.testSubj.locator('actionPolicyExecutionHistoryTable');
    this.policyDetailsFlyout = this.page.testSubj.locator('actionPolicyDetailsFlyout');
  }

  async goto(spaceId?: string) {
    if (spaceId) {
      await this.page.goto(
        this.kbnUrl.app('management/alertingV2/execution_history', { space: spaceId })
      );
      return;
    }
    await this.page.gotoApp('management/alertingV2/execution_history');
  }

  async openActionPoliciesTab() {
    await this.actionPoliciesTab.click();
    await this.actionPoliciesTab
      .and(this.page.locator('[aria-selected="true"]'))
      .waitFor({ state: 'visible' });
    await this.policiesTable.waitFor({ state: 'visible' });
  }

  async search(value: string) {
    await this.searchBar.fill(value);
  }

  policyRow(policyName: string): Locator {
    return this.policiesTable.getByRole('row', { name: policyName });
  }

  async openPolicyDetails(policyName: string) {
    await this.policyRow(policyName).getByRole('button', { name: policyName }).click();
  }
}
