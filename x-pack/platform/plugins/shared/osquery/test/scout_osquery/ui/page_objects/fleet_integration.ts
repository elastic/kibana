/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class FleetIntegrationPage {
  public readonly gotItButton: Locator;
  public readonly createAgentPolicyButton: Locator;
  public readonly createAgentPolicyNameField: Locator;
  public readonly createAgentPolicyFlyoutBtn: Locator;
  public readonly agentPolicyNameLink: Locator;
  public readonly addPackagePolicyButton: Locator;
  public readonly addIntegrationFlyout: Locator;
  public readonly addIntegrationFlyoutSubmit: Locator;
  public readonly packagePolicyNameInput: Locator;
  public readonly integrationPolicyUpgradeBtn: Locator;

  constructor(private readonly page: ScoutPage) {
    this.gotItButton = this.page.getByRole('button', { name: 'Got it' });
    this.createAgentPolicyButton = this.page.testSubj.locator('createAgentPolicyButton');
    this.createAgentPolicyNameField = this.page.testSubj.locator('createAgentPolicyNameField');
    this.createAgentPolicyFlyoutBtn = this.page.testSubj.locator('createAgentPolicyFlyoutBtn');
    this.agentPolicyNameLink = this.page.testSubj.locator('agentPolicyNameLink');
    this.addPackagePolicyButton = this.page.testSubj.locator('addPackagePolicyButton');
    this.addIntegrationFlyout = this.page.testSubj.locator('addIntegrationFlyout');
    this.addIntegrationFlyoutSubmit = this.page.testSubj.locator('addIntegrationFlyout.submitBtn');
    this.packagePolicyNameInput = this.page.testSubj.locator('packagePolicyNameInput');
    this.integrationPolicyUpgradeBtn = this.page.testSubj.locator('integrationPolicyUpgradeBtn');
  }

  /** Clicks Fleet "Got it" tour; caller must ensure the button is visible. */
  async dismissFleetTour(): Promise<void> {
    await this.gotItButton.click();
  }

  async gotoFleetAgentPolicies(): Promise<void> {
    await this.page.gotoApp('fleet/policies');
  }

  async gotoFleetIntegrations(): Promise<void> {
    await this.page.gotoApp('integrations');
  }

  async gotoOsqueryManagerIntegrationDetail(): Promise<void> {
    await this.page.gotoApp('integrations/detail/osquery_manager/overview');
  }

  async gotoOsqueryManagerIntegrationDetailForVersion(version: string): Promise<void> {
    await this.page.gotoApp(`integrations/detail/osquery_manager-${version}/overview`);
  }

  /** Create policy; dismiss Fleet tour first if it can appear. */
  async createAgentPolicy(policyName: string): Promise<void> {
    const headerCreate = this.createAgentPolicyButton;
    const emptyStateCreate = this.page.testSubj.locator('emptyPromptCreateAgentPolicyButton');

    await headerCreate.waitFor({ state: 'visible', timeout: 120_000 });

    if (await emptyStateCreate.isVisible().catch(() => false)) {
      await expect(emptyStateCreate).toBeEnabled({ timeout: 30_000 });
      await emptyStateCreate.click();
    } else {
      await expect(headerCreate).toBeEnabled({ timeout: 30_000 });
      await headerCreate.click();
    }

    await this.createAgentPolicyNameField.fill(policyName);
    await this.createAgentPolicyFlyoutBtn.click();
  }

  /** Open policy row by name. */
  async openAgentPolicy(policyName: string): Promise<void> {
    await this.agentPolicyNameLink.filter({ hasText: policyName }).click();
  }

  async addOsqueryManagerIntegrationToPolicy(integrationName: string): Promise<void> {
    await this.addPackagePolicyButton.click();
    await this.addIntegrationFlyout.waitFor({ state: 'visible' });

    // Fill inner combobox search input (wrapper is not fillable).
    const integrationSearchInput = this.addIntegrationFlyout.locator(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    await integrationSearchInput.fill('osquery manager');

    // Options render in a portaled overlay — match on body, first option.
    await this.page
      .getByRole('option', { name: /Osquery Manager/i })
      // eslint-disable-next-line playwright/no-nth-methods -- portaled listbox
      .first()
      .click();

    const packagePolicyNameField = this.page.getByTestId('packagePolicyNameInput');
    await packagePolicyNameField.waitFor({ state: 'visible', timeout: 120_000 });
    await packagePolicyNameField.fill('');
    await packagePolicyNameField.fill(integrationName);
    await this.addIntegrationFlyoutSubmit.click();
    await this.page.locator(`[title="${integrationName}"]`).waitFor({ timeout: 60_000 });
  }

  async clickUpgradeIntegrationPolicy(integrationName: string): Promise<void> {
    const row = this.page.locator(`tr:has([title="${integrationName}"])`);
    await row.locator(this.integrationPolicyUpgradeBtn).click();
  }
}
