/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface UserFormValues {
  username?: string;
  password?: string;
  confirm_password?: string;
  full_name?: string;
  email?: string;
  roles?: string[];
}

export interface UserRowData {
  username: string;
  fullname: string;
  email: string;
  roles: string[];
  reserved: boolean;
  deprecated: boolean;
  enabled: boolean;
}

export class SecurityUsersPage {
  public readonly createUserButton: Locator;
  public readonly searchUsersInput: Locator;
  public readonly showReservedUsersSwitch: Locator;
  public readonly deleteUserButton: Locator;
  public readonly confirmModalConfirmButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createUserButton = page.testSubj.locator('createUserButton');
    this.searchUsersInput = page.testSubj.locator('searchUsers');
    this.showReservedUsersSwitch = page.testSubj.locator('showReservedUsersSwitch');
    this.deleteUserButton = page.testSubj.locator('deleteUserButton');
    this.confirmModalConfirmButton = page.testSubj.locator('confirmModalConfirmButton');
  }

  async goto() {
    await this.page.gotoApp('management/security/users');
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async clickCreateNewUser() {
    await this.createUserButton.click();
    await this.page.testSubj.locator('userFormUserNameInput').waitFor({ state: 'visible' });
  }

  async fillUserForm(user: UserFormValues) {
    if (user.username) {
      await this.page.testSubj.locator('userFormUserNameInput').fill(user.username);
    }
    if (user.password) {
      await this.page.testSubj.locator('passwordInput').fill(user.password);
    }
    if (user.confirm_password) {
      await this.page.testSubj.locator('passwordConfirmationInput').fill(user.confirm_password);
    }
    if (user.full_name) {
      await this.page.testSubj.locator('userFormFullNameInput').fill(user.full_name);
    }
    if (user.email) {
      await this.page.testSubj.locator('userFormEmailInput').fill(user.email);
    }
    if (user.roles) {
      await this.page.components.comboBox('rolesDropdown').setSelectedOptions(user.roles);
    }
  }

  async selectRole(role: string) {
    await this.page.components.comboBox('rolesDropdown').setSelectedOptions([role]);
  }

  async submitCreateUser() {
    await this.page.getByRole('button', { name: 'Create user' }).click();
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async submitUpdateUser() {
    await this.page.getByRole('button', { name: 'Update user' }).click();
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async createUser(user: UserFormValues) {
    await this.goto();
    await this.clickCreateNewUser();
    await this.fillUserForm(user);
    await this.submitCreateUser();
  }

  async findUserRow(username: string): Promise<Locator> {
    await this.createUserButton.waitFor({ state: 'visible' });
    await this.searchUsersInput.fill(username);
    await this.searchUsersInput.press('Enter');
    await this.page.waitForURL(
      (url) => url.searchParams.get('q') === username && !url.searchParams.has('page')
    );
    const row = this.page.testSubj.locator('userRow').filter({
      has: this.page.getByRole('link', { name: username, exact: true }),
    });
    const nextPage = this.page.testSubj.locator('pagination-button-next');
    while (
      !(await row.isVisible()) &&
      (await nextPage.isVisible()) &&
      (await nextPage.isEnabled())
    ) {
      const currentPage = new URL(this.page.url()).searchParams.get('page');
      await nextPage.click();
      await this.page.waitForURL((url) => url.searchParams.get('page') !== currentPage);
    }
    return row;
  }

  async clickUserByName(username: string) {
    const row = await this.findUserRow(username);
    await row.getByRole('link', { name: username, exact: true }).click();
    await this.page.testSubj.locator('userFormUserNameInput').waitFor({ state: 'visible' });
  }

  async deleteUser(username: string) {
    await this.clickUserByName(username);
    await this.page.getByRole('button', { name: 'Delete user' }).click();
    await this.confirmModalConfirmButton.click();
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async backToUsersList() {
    await this.page.testSubj.locator('appHeaderBack').click();
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async updateUserProfile(user: UserFormValues) {
    await this.clickUserByName(user.username ?? '');
    if (user.full_name) {
      await this.page.testSubj.locator('userFormFullNameInput').fill(user.full_name);
    }
    if (user.email) {
      await this.page.testSubj.locator('userFormEmailInput').fill(user.email);
    }
    await this.submitUpdateUser();
  }

  async updateUserPassword(
    user: UserFormValues & { current_password?: string },
    isCurrentUser = false
  ) {
    await this.clickUserByName(user.username ?? '');
    await this.page.testSubj.locator('editUserChangePasswordButton').click();
    if (isCurrentUser && user.current_password) {
      await this.page.testSubj
        .locator('editUserChangePasswordCurrentPasswordInput')
        .fill(user.current_password);
    }
    await this.page.testSubj
      .locator('editUserChangePasswordNewPasswordInput')
      .pressSequentially(user.password ?? '');
    await this.page.testSubj
      .locator('editUserChangePasswordConfirmPasswordInput')
      .pressSequentially(user.confirm_password ?? '');
    await this.page.testSubj.locator('editUserChangePasswordConfirmPasswordInput').blur();
    await this.page.testSubj.locator('changePasswordFormSubmitButton').click();
  }

  async deactivateUser(username: string) {
    await this.clickUserByName(username);
    await this.page.testSubj.locator('editUserDisableUserButton').click();
    await this.confirmModalConfirmButton.click();
    await this.page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'hidden' });
    await this.backToUsersList();
  }

  async activateUser(username: string) {
    await this.clickUserByName(username);
    await this.page.testSubj.locator('editUserEnableUserButton').click();
    await this.confirmModalConfirmButton.click();
    await this.page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'hidden' });
    await this.backToUsersList();
  }

  async getUserRowData(row: Locator): Promise<UserRowData> {
    const username = await row.locator('[data-test-subj="userRowUserName"]').innerText();
    const fullname = await row.locator('[data-test-subj="userRowFullName"]').innerText();
    const email = await row.locator('[data-test-subj="userRowEmail"]').innerText();
    const rolesText = await row.locator('[data-test-subj="userRowRoles"]').innerText();
    const roles = rolesText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    const reserved = (await row.locator('[data-test-subj="userReserved"]').count()) > 0;
    const deprecated = (await row.locator('[data-test-subj="userDeprecated"]').count()) > 0;
    const enabled = (await row.locator('[data-test-subj="userDisabled"]').count()) === 0;
    return { username, fullname, email, roles, reserved, deprecated, enabled };
  }

  async getUser(username: string): Promise<UserRowData> {
    await this.goto();
    const row = await this.findUserRow(username);
    await expect(row).toBeVisible();
    return this.getUserRowData(row);
  }

  async expectUserAbsent(username: string) {
    await this.goto();
    await expect(await this.findUserRow(username)).toHaveCount(0);
  }
}
