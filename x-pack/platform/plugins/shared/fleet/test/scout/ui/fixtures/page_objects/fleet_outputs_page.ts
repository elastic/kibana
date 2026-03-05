/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  SETTINGS_OUTPUTS,
  SETTINGS_OUTPUTS_KAFKA,
  SETTINGS_SAVE_BTN,
  CONFIRM_MODAL,
} from '../../common/selectors';

export class FleetOutputsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.goto('/app/fleet/settings');
    await this.page.testSubj
      .locator(SETTINGS_OUTPUTS.TABLE)
      .waitFor({ state: 'visible', timeout: 20_000 });
  }

  async navigateToOutput(outputId: string) {
    await this.page.goto(`/app/fleet/settings/outputs/${outputId}`);
    await this.page.testSubj
      .locator(SETTINGS_OUTPUTS.NAME_INPUT)
      .waitFor({ state: 'visible', timeout: 20_000 });
  }

  getAddOutputButton() {
    return this.page.testSubj.locator(SETTINGS_OUTPUTS.ADD_BTN);
  }

  getTypeInput() {
    return this.page.testSubj.locator(SETTINGS_OUTPUTS.TYPE_INPUT);
  }

  getNameInput() {
    return this.page.testSubj.locator(SETTINGS_OUTPUTS.NAME_INPUT);
  }

  getSaveButton() {
    return this.page.testSubj.locator(SETTINGS_SAVE_BTN);
  }

  getConfirmModalButton() {
    return this.page.testSubj.locator(CONFIRM_MODAL.CONFIRM_BUTTON);
  }

  getKafkaAuthUsernamePasswordOption() {
    return this.page.testSubj.locator(
      SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION
    );
  }

  getKafkaUsernameInput() {
    return this.page.testSubj.locator(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
  }

  getKafkaPasswordInput() {
    return this.page.testSubj.locator(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);
  }

  async addESOutput(name: string, hosts: string[]) {
    await this.getAddOutputButton().click();
    await this.getTypeInput().selectOption('elasticsearch');
    await this.getNameInput().fill(name);
    await this.page.getByPlaceholder('Specify host').fill(hosts[0]);
  }

  async addRemoteESOutput(name: string, _hosts: string[]) {
    await this.getAddOutputButton().click();
    await this.getTypeInput().selectOption('remote_elasticsearch');
    await this.getNameInput().fill(name);
  }

  async addKafkaOutput(name: string) {
    await this.getAddOutputButton().click();
    await this.getTypeInput().selectOption('kafka');
    await this.getKafkaAuthUsernamePasswordOption().getByRole('radio').click();
    await this.getNameInput().fill(name);
  }

  async save() {
    await this.getSaveButton().click();
    await this.getConfirmModalButton().click();
  }
}
