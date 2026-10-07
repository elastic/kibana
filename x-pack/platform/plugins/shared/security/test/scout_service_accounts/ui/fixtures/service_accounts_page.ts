/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class ServiceAccountsPage {
  readonly flyout;
  readonly rolesSelector;
  readonly submitButton;
  readonly description;

  constructor(private readonly page: ScoutPage) {
    this.flyout = page.testSubj.locator('createServiceAccountFlyout');
    this.rolesSelector = page.testSubj.locator('serviceAccountRolesSelector');
    this.submitButton = page.testSubj.locator('createServiceAccountSubmit');
    this.description = page.testSubj.locator('createServiceAccountDescription');
  }

  async openCreateFlyout() {
    await this.page.gotoApp('management/security/service_accounts/create');
    await this.flyout.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async setName(name: string) {
    await this.page.testSubj.fill('serviceAccountNameInput', name);
  }

  async openRoles() {
    await this.rolesSelector.click();
  }

  roleOption(name: string) {
    return this.page.testSubj.locator(`roleOption-${name}`);
  }

  async selectRole(name: string) {
    await this.roleOption(name).click();
  }

  async closeRoles() {
    await this.page.keyboard.press('Escape');
  }

  async cancel() {
    await this.flyout.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
}
