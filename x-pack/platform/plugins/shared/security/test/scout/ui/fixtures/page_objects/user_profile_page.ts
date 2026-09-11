/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

type ThemeMode = 'dark' | 'light' | 'space_default';

export class UserProfilePage {
  public readonly fullNameInput: Locator;
  public readonly emailInput: Locator;
  public readonly saveProfileChangesButton: Locator;
  public readonly changePasswordButton: Locator;
  public readonly changePasswordCurrentInput: Locator;
  public readonly changePasswordNewInput: Locator;
  public readonly changePasswordConfirmInput: Locator;
  public readonly changePasswordSubmitButton: Locator;
  public readonly themeKeypadMenu: Locator;
  public readonly windowReloadButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.fullNameInput = page.testSubj.locator('userProfileFullName');
    this.emailInput = page.testSubj.locator('userProfileEmail');
    this.saveProfileChangesButton = page.testSubj.locator('saveProfileChangesButton');
    this.changePasswordButton = page.testSubj.locator('openChangePasswordForm');
    this.changePasswordCurrentInput = page.testSubj.locator(
      'editUserChangePasswordCurrentPasswordInput'
    );
    this.changePasswordNewInput = page.testSubj.locator('editUserChangePasswordNewPasswordInput');
    this.changePasswordConfirmInput = page.testSubj.locator(
      'editUserChangePasswordConfirmPasswordInput'
    );
    this.changePasswordSubmitButton = page.testSubj.locator('changePasswordFormSubmitButton');
    this.themeKeypadMenu = page.testSubj.locator('themeMenu');
    this.windowReloadButton = page.testSubj.locator('windowReloadButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('security_account');
  }

  async setFullName(fullName: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
  }

  async setEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async clearEmail(): Promise<void> {
    await this.emailInput.clear();
  }

  async saveChanges(): Promise<void> {
    await this.saveProfileChangesButton.click();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.changePasswordButton.click();
    await this.changePasswordCurrentInput.pressSequentially(currentPassword);
    await this.changePasswordNewInput.pressSequentially(newPassword);
    await this.changePasswordConfirmInput.pressSequentially(newPassword);
    await this.changePasswordSubmitButton.click();
  }

  themeKeypadButton(mode: ThemeMode): Locator {
    return this.page.testSubj.locator(`themeKeyPadItem${mode}`);
  }

  async changeTheme(mode: ThemeMode): Promise<void> {
    await this.themeKeypadButton(mode).click();
    await this.saveProfileChangesButton.click();
    await this.windowReloadButton.waitFor({ state: 'visible' });
    await this.windowReloadButton.click();
    await this.themeKeypadMenu.waitFor({ state: 'visible' });
  }

  async getThemeTag(): Promise<string> {
    return this.page.evaluate(
      () => (window as unknown as Record<string, unknown>).__kbnThemeTag__ as string
    );
  }
}
