/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import type { AlertingMountConfig } from './alerting_mount_config';

export class ExecutionHistoryPage {
  public readonly emptyPrompt: Locator;
  public readonly retryButton: Locator;
  public readonly rulesTab: Locator;
  public readonly actionPoliciesTab: Locator;
  public readonly searchBar: Locator;
  public readonly policiesTable: Locator;
  public readonly policyDetailsFlyout: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl,
    private readonly mountConfig: AlertingMountConfig
  ) {
    this.emptyPrompt = this.page.testSubj.locator('ruleExecutionHistoryEmptyPrompt');
    this.retryButton = this.page.testSubj.locator('executionHistoryRetryButton');
    this.rulesTab = this.page.testSubj.locator('executionHistoryRulesTab');
    this.actionPoliciesTab = this.page.testSubj.locator('executionHistoryPoliciesTab');
    this.searchBar = this.page.testSubj.locator('executionHistorySearchBar');
    this.policiesTable = this.page.testSubj.locator('policyExecutionHistoryTable');
    this.policyDetailsFlyout = this.page.testSubj.locator('actionPolicyDetailsFlyout');
  }

  async goto(spaceId?: string) {
    const appPath = `${this.mountConfig.appRoute}${this.mountConfig.paths.executionHistory}`;
    if (spaceId) {
      await this.page.goto(this.kbnUrl.app(appPath, { space: spaceId }));
      return;
    }
    await this.page.gotoApp(appPath);
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
