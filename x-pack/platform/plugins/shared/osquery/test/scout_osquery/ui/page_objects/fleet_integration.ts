/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class FleetIntegrationPage {
  public readonly gotItButton: Locator;
  public readonly createAgentPolicyButton: Locator;
  public readonly createAgentPolicyNameField: Locator;
  public readonly createAgentPolicyFlyoutBtn: Locator;
  public readonly agentPolicyNameLink: Locator;
  public readonly addPackagePolicyButton: Locator;
  public readonly addIntegrationFlyout: Locator;
  public readonly addIntegrationFlyoutSubmit: Locator;
  public readonly comboBoxInput: Locator;
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
    this.comboBoxInput = this.page.testSubj.locator('comboBoxInput');
    this.packagePolicyNameInput = this.page.testSubj.locator('packagePolicyNameInput');
    this.integrationPolicyUpgradeBtn = this.page.testSubj.locator('integrationPolicyUpgradeBtn');
  }

  /**
   * Click the Fleet tour's "Got it" button. Callers MUST know the tour is
   * visible — this method does not no-op when the button is absent. Playwright
   * creates a fresh browser context per test, so the tour is present on the
   * first Fleet navigation within a test (or not at all, on subsequent
   * navigations within the same test).
   */
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

  /**
   * Create a new agent policy via the Fleet UI. Callers SHOULD dismiss the
   * Fleet first-visit tour (`dismissFleetTour`) in a spec-level `beforeEach`
   * before invoking this method, or its first click will be intercepted by
   * the tour overlay.
   */
  async createAgentPolicy(policyName: string): Promise<void> {
    await this.createAgentPolicyButton.click();
    await this.createAgentPolicyNameField.fill(policyName);
    await this.createAgentPolicyFlyoutBtn.click();
  }

  /**
   * Open an existing agent policy by name. Callers are responsible for any
   * tour dismissal (see `dismissFleetTour`).
   */
  async openAgentPolicy(policyName: string): Promise<void> {
    await this.agentPolicyNameLink.filter({ hasText: policyName }).click();
  }

  async addOsqueryManagerIntegrationToPolicy(integrationName: string): Promise<void> {
    await this.addPackagePolicyButton.click();
    await this.addIntegrationFlyout.waitFor({ state: 'visible' });

    await this.comboBoxInput.fill('osquery manager');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.packagePolicyNameInput.fill('');
    await this.packagePolicyNameInput.fill(integrationName);
    await this.addIntegrationFlyoutSubmit.click();
    await this.page.locator(`[title="${integrationName}"]`).waitFor({ timeout: 60_000 });
  }

  async clickUpgradeIntegrationPolicy(integrationName: string): Promise<void> {
    const row = this.page.locator(`tr:has([title="${integrationName}"])`);
    await row.locator(this.integrationPolicyUpgradeBtn).click();
  }
}
