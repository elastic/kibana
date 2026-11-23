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
  public readonly ruleSearchBar: Locator;
  public readonly ruleExecutionsTable: Locator;
  public readonly filteredEmptyPrompt: Locator;
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
    this.ruleSearchBar = this.page.testSubj.locator('ruleExecutionHistorySearch');
    this.ruleExecutionsTable = this.page.testSubj.locator('ruleExecutionHistoryTable');
    this.filteredEmptyPrompt = this.page.testSubj.locator('executionHistoryFilteredEmptyPrompt');
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

  async searchRules(value: string) {
    await this.ruleSearchBar.fill(value);
  }

  /** Every execution-history grid row for the policy. A policy may dispatch more than once. */
  policyRows(policyName: string): Locator {
    return this.policiesTable.getByRole('row', { name: policyName });
  }

  async openPolicyDetails(policyName: string) {
    // A policy can have multiple execution rows; open the details from the top grid row so the
    // policy-link match stays unambiguous under strict mode. The `[data-test-subj="dataGridRowCell"]`
    // prefix keeps this raw locator within the Playwright lint allow-list.
    await this.policiesTable
      .locator('[data-test-subj="dataGridRowCell"][data-gridcell-visible-row-index="0"]')
      .getByRole('button', { name: policyName })
      .click();
  }
}
