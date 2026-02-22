/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  AGENT_FLYOUT,
  LANDING_PAGE_ADD_FLEET_SERVER_BUTTON,
  FLEET_SERVER_SETUP,
  PLATFORM_TYPE_LINUX_BUTTON,
  ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON,
  ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON,
} from '../../common/selectors';

export class AgentFlyoutPage {
  constructor(private readonly page: ScoutPage) {}

  async openFromLanding() {
    await this.page.gotoApp('fleet');
    await this.page.testSubj.locator(LANDING_PAGE_ADD_FLEET_SERVER_BUTTON).click();
    await this.page.testSubj
      .locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON)
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  getQuickStartTab() {
    return this.page.testSubj.locator(AGENT_FLYOUT.QUICK_START_TAB_BUTTON);
  }

  getAdvancedTab() {
    return this.page.testSubj.locator(AGENT_FLYOUT.ADVANCED_TAB_BUTTON);
  }

  getCloseButton() {
    return this.page.testSubj.locator(AGENT_FLYOUT.CLOSE_BUTTON);
  }

  getCreatePolicyButton() {
    return this.page.testSubj.locator(AGENT_FLYOUT.CREATE_POLICY_BUTTON);
  }

  getPolicyDropdown() {
    return this.page.testSubj.locator(AGENT_FLYOUT.POLICY_DROPDOWN);
  }

  getConfirmAgentEnrollmentButton() {
    return this.page.testSubj.locator(AGENT_FLYOUT.CONFIRM_AGENT_ENROLLMENT_BUTTON);
  }

  getIncomingDataConfirmedCallOut() {
    return this.page.testSubj.locator(AGENT_FLYOUT.INCOMING_DATA_CONFIRMED_CALL_OUT);
  }

  getPlatformSelectorExtended() {
    return this.page.testSubj.locator(AGENT_FLYOUT.PLATFORM_SELECTOR_EXTENDED);
  }

  getLinuxPlatformButton() {
    return this.page.testSubj.locator(PLATFORM_TYPE_LINUX_BUTTON);
  }

  getFleetServerSetupSelectHosts() {
    return this.page.testSubj.locator(FLEET_SERVER_SETUP.SELECT_HOSTS);
  }

  getFleetServerSetupAddHostButton() {
    return this.page.testSubj.locator(FLEET_SERVER_SETUP.ADD_HOST_BTN);
  }

  getFleetServerSetupNameInput() {
    return this.page.testSubj.locator(FLEET_SERVER_SETUP.NAME_INPUT);
  }

  getAddHostButton() {
    return this.page.testSubj.locator(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON);
  }

  getGenerateServiceTokenButton() {
    return this.page.testSubj.locator(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON);
  }

  async switchToAdvancedTab() {
    await this.getAdvancedTab().click();
  }

  async addFleetServerHost(name: string, hostUrl: string) {
    await this.getFleetServerSetupSelectHosts().click();
    await this.getFleetServerSetupAddHostButton().click();
    await this.getFleetServerSetupNameInput().fill(name);
    await this.page.getByPlaceholder('Specify host URL').fill(hostUrl);
  }
}
