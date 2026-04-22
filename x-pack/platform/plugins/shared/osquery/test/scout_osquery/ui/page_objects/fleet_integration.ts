/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

export class FleetIntegrationPage {
  constructor(private readonly page: ScoutPage) {}

  /** Fleet tour shows a "Got it" button on first visit. Dismiss it if present. */
  async closeFleetTourIfVisible(): Promise<void> {
    const gotItButton = this.page.getByRole('button', { name: 'Got it' });
    if (await gotItButton.isVisible().catch(() => false)) {
      await gotItButton.click();
    }
  }

  async gotoFleetAgentPolicies(): Promise<void> {
    await this.page.gotoApp('fleet/policies');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async gotoFleetIntegrations(): Promise<void> {
    await this.page.gotoApp('integrations');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async gotoOsqueryManagerIntegrationDetail(): Promise<void> {
    await this.page.gotoApp('integrations/detail/osquery_manager/overview');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async gotoOsqueryManagerIntegrationDetailForVersion(version: string): Promise<void> {
    await this.page.gotoApp(`integrations/detail/osquery_manager-${version}/overview`);
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async createAgentPolicy(policyName: string): Promise<void> {
    await this.closeFleetTourIfVisible();
    await this.page.testSubj.locator('createAgentPolicyButton').click();
    await this.page.testSubj.locator('createAgentPolicyNameField').fill(policyName);
    await this.page.testSubj.locator('createAgentPolicyFlyoutBtn').click();
    await this.closeFleetTourIfVisible();
  }

  async openAgentPolicy(policyName: string): Promise<void> {
    await this.closeFleetTourIfVisible();
    await this.page.testSubj.locator('agentPolicyNameLink').filter({ hasText: policyName }).click();
    await this.closeFleetTourIfVisible();
  }

  async addOsqueryManagerIntegrationToPolicy(integrationName: string): Promise<void> {
    await this.page.testSubj.locator('addPackagePolicyButton').click();
    await this.page.testSubj.locator('addIntegrationFlyout').waitFor({ state: 'visible' });
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});

    const comboBox = this.page.testSubj.locator('comboBoxInput');
    await comboBox.fill('osquery manager');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.page.testSubj.locator('packagePolicyNameInput').fill('');
    await this.page.testSubj.locator('packagePolicyNameInput').fill(integrationName);
    await this.page.testSubj.locator('addIntegrationFlyout.submitBtn').click();
    await this.page.locator(`[title="${integrationName}"]`).waitFor({ timeout: 60_000 });
  }

  async clickUpgradeIntegrationPolicy(integrationName: string): Promise<void> {
    const row = this.page.locator(`tr:has([title="${integrationName}"])`);
    await row.locator(this.page.testSubj.locator('integrationPolicyUpgradeBtn')).click();
  }
}
