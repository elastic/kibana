/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  SETTINGS_FLEET_SERVER_HOST_HEADING,
  SETTINGS_SAVE_BTN,
  CONFIRM_MODAL,
  SETTINGS_FLEET_SERVER_HOSTS,
  AGENT_BINARY_SOURCES_TABLE,
  AGENT_BINARY_SOURCES_TABLE_ACTIONS,
  AGENT_BINARY_SOURCES_FLYOUT,
} from '../../common/selectors';

export class FleetSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('fleet');
    await this.page.testSubj.locator('fleet-settings-tab').click();
    await this.page.testSubj
      .locator(SETTINGS_FLEET_SERVER_HOST_HEADING)
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  async navigateToOutputs() {
    await this.page.goto('/app/fleet/settings');
  }

  getFleetServerHostHeader() {
    return this.page.testSubj.locator(SETTINGS_FLEET_SERVER_HOST_HEADING);
  }

  getSaveButton() {
    return this.page.testSubj.locator(SETTINGS_SAVE_BTN);
  }

  getConfirmModalButton() {
    return this.page.testSubj.locator(CONFIRM_MODAL.CONFIRM_BUTTON);
  }

  getAddFleetServerHostButton() {
    return this.page.testSubj.locator(SETTINGS_FLEET_SERVER_HOSTS.ADD_BUTTON);
  }

  getFleetServerHostsTable() {
    return this.page.testSubj.locator(SETTINGS_FLEET_SERVER_HOSTS.TABLE);
  }

  // Agent binary download sources
  getAgentBinarySourcesTable() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE);
  }

  getAddDownloadSourceButton() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.ADD);
  }

  getEditDownloadSourceButton() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.EDIT);
  }

  getDownloadSourceFlyoutNameInput() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT);
  }

  getDownloadSourceFlyoutHostInput() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT);
  }

  getDownloadSourceFlyoutIsDefaultSwitch() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.IS_DEFAULT_SWITCH);
  }

  getDownloadSourceFlyoutSubmitButton() {
    return this.page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON);
  }

  async addDownloadSource(name: string, host: string, isDefault = false) {
    await this.getAddDownloadSourceButton().click();
    await this.getDownloadSourceFlyoutNameInput().fill(name);
    await this.getDownloadSourceFlyoutHostInput().fill(host);
    if (isDefault) {
      await this.getDownloadSourceFlyoutIsDefaultSwitch().click();
    }
    await this.getDownloadSourceFlyoutSubmitButton().click();
    await this.getConfirmModalButton().click();
  }

  async editDownloadSource(name: string, host: string) {
    await this.getAgentBinarySourcesTable()
      .getByRole('row')
      .filter({ has: this.page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.EDIT) })
      .locator(this.page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.EDIT))
      .click();
    await this.getDownloadSourceFlyoutNameInput().clear();
    await this.getDownloadSourceFlyoutNameInput().fill(name);
    await this.getDownloadSourceFlyoutHostInput().clear();
    await this.getDownloadSourceFlyoutHostInput().fill(host);
    await this.getDownloadSourceFlyoutSubmitButton().click();
    await this.getConfirmModalButton().click();
  }
}
