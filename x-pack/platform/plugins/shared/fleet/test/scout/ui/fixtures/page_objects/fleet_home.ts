/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

const FLEET_AGENTS_TAB_SELECTOR = 'fleet-agents-tab';
const FLEET_SETUP_LOADING_SELECTOR = 'fleetSetupLoading';

export class FleetHomePage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('fleet');
  }

  async waitForPageToLoad() {
    await this.page.waitForLoadingIndicatorHidden();
    await this.page.testSubj.waitForSelector(FLEET_AGENTS_TAB_SELECTOR, { state: 'visible' });
    await this.page.testSubj.waitForSelector(FLEET_SETUP_LOADING_SELECTOR, { state: 'hidden' });
  }

  getMissingPrivilegesPromptTitle() {
    return this.page.testSubj.locator('missingPrivilegesPromptTitle');
  }

  getAgentsTab() {
    return this.page.testSubj.locator('fleet-agents-tab');
  }

  getAddAgentButton() {
    return this.page.testSubj.locator('addAgentButton');
  }

  getAddFleetServerHeader() {
    return this.page.testSubj.locator('addFleetServerHeader');
  }

  getAgentPoliciesTab() {
    return this.page.testSubj.locator('fleet-agent-policies-tab');
  }

  getSettingsTab() {
    return this.page.testSubj.locator('fleet-settings-tab');
  }

  getUninstallTokensTab() {
    return this.page.testSubj.locator('fleet-uninstall-tokens-tab');
  }

  async navigateToAgentPoliciesTab() {
    await this.getAgentPoliciesTab().click();
  }

  getAgentPolicyNameLink() {
    return this.page.testSubj.locator('agentPolicyNameLink');
  }

  getAddPackagePolicyButton() {
    return this.page.testSubj.locator('addPackagePolicyButton');
  }

  getSaveIntegrationButton() {
    return this.page.testSubj.locator('saveIntegration');
  }

  getPackagePolicyLink(name: string) {
    return this.page.locator(`a[title="${name}"]`);
  }

  getCreateAgentPolicyButton() {
    return this.page.testSubj.locator('createAgentPolicyButton');
  }

  async navigateToSettingsTab() {
    await this.getSettingsTab().click();
  }

  getAddOutputButton() {
    return this.page.testSubj.locator('addOutputBtn');
  }

  getAddFleetServerHostButton() {
    return this.page.testSubj.locator('settings.fleetServerHosts.addFleetServerHostBtn');
  }

  getFleetServerMissingPrivilegesPrompt() {
    return this.page.testSubj.locator('fleetServerMissingPrivilegesPrompt');
  }
}
