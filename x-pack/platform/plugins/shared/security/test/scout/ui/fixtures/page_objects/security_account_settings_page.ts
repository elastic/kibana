/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SecurityAccountSettingsPage {
  public readonly changePasswordFormSubmitButton: Locator;
  public readonly changePasswordFormCancelButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.changePasswordFormSubmitButton = page.testSubj.locator('changePasswordFormSubmitButton');
    this.changePasswordFormCancelButton = page.testSubj.locator('changePasswordFormCancelButton');
  }

  async goto() {
    await this.page.gotoApp('security/account');
  }

  async getUsernameText(): Promise<string> {
    return this.page.testSubj.locator('username').innerText();
  }

  async openChangePasswordForm() {
    await this.page.getByRole('button', { name: 'Change password' }).click();
    await this.changePasswordFormSubmitButton.waitFor({ state: 'visible' });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.openChangePasswordForm();
    await this.page.getByLabel('Current password').fill(currentPassword);
    await this.page.getByLabel('New password', { exact: true }).fill(newPassword);
    await this.page.getByLabel('Confirm password').fill(newPassword);
    await this.changePasswordFormSubmitButton.click();
    await this.page.testSubj
      .locator('euiToastHeader__title')
      .filter({ hasText: 'Password successfully changed' })
      .waitFor({ state: 'visible' });
  }
}
