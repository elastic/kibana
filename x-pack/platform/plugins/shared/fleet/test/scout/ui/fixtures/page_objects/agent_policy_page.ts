/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  AGENT_POLICY_DETAILS_PAGE,
  AGENT_POLICIES_TABLE,
  ADD_AGENT_POLICY_BTN,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX,
  AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT,
  AGENT_POLICY_FORM,
} from '../../common/selectors';

export class AgentPolicyPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToPolicies() {
    await this.page.gotoApp('fleet');
    await this.page.testSubj.locator('fleet-agent-policies-tab').click();
    await this.page.testSubj
      .locator(AGENT_POLICIES_TABLE)
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  async navigateToPolicySettings(policyId: string) {
    await this.page.goto(`/app/fleet/policies/${policyId}/settings`);
    await this.page.testSubj
      .locator(AGENT_POLICY_DETAILS_PAGE.SETTINGS_TAB)
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  getCreateAgentPolicyButton() {
    return this.page.testSubj.locator(ADD_AGENT_POLICY_BTN);
  }

  getCreateFlyoutButton() {
    return this.page.testSubj.locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON);
  }

  getNameField() {
    return this.page.testSubj.locator(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD);
  }

  getSystemMonitoringCheckbox() {
    return this.page.testSubj.locator(AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX);
  }

  getFlyoutCreateButton() {
    return this.page.testSubj.locator(AGENT_POLICY_FLYOUT_CREATE_BUTTON);
  }

  getSettingsTab() {
    return this.page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SETTINGS_TAB);
  }

  getSpaceSelectorComboBox() {
    return this.page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SPACE_SELECTOR_COMBOBOX);
  }

  getSaveButton() {
    return this.page.testSubj.locator(AGENT_POLICY_DETAILS_PAGE.SAVE_BUTTON);
  }

  getDownloadSourceSelect() {
    return this.page.testSubj.locator(AGENT_POLICY_FORM.DOWNLOAD_SOURCE_SELECT);
  }

  async createAgentPolicy(name: string, options?: { uncheckSystemMonitoring?: boolean }) {
    await this.getCreateFlyoutButton().click();
    await this.page.testSubj
      .locator(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE)
      .waitFor({ state: 'visible', timeout: 15_000 });
    await this.getNameField().fill(name);
    if (options?.uncheckSystemMonitoring) {
      await this.getSystemMonitoringCheckbox().uncheck();
    }
    await this.getFlyoutCreateButton().click();
  }

  getPolicyLink(title: string) {
    return this.page.getByRole('link', { name: title });
  }
}
