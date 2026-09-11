/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

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
    for (const role of user.roles ?? []) {
      await this.selectRole(role);
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
  }

  async createUser(user: UserFormValues) {
    await this.goto();
    await this.clickCreateNewUser();
    await this.fillUserForm(user);
    await this.submitCreateUser();
  }

  async clickUserByName(username: string) {
    await this.page.getByRole('link', { name: username }).click();
  }

  async deleteUser(username: string) {
    await this.clickUserByName(username);
    await this.page.getByRole('button', { name: 'Delete user' }).click();
    await this.confirmModalConfirmButton.click();
    await this.createUserButton.waitFor({ state: 'visible' });
  }

  async backToUsersList() {
    await this.page.testSubj.locator('euiHeaderBack').click();
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
      .fill(user.password ?? '');
    await this.page.testSubj
      .locator('editUserChangePasswordConfirmPasswordInput')
      .fill(user.confirm_password ?? '');
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

  async getUserRows(): Promise<Locator[]> {
    await this.page.components.comboBox('tablePaginationPopoverButton');
    const paginationButton = this.page.testSubj.locator('tablePaginationPopoverButton');
    await paginationButton.click();
    await this.page.testSubj.locator('tablePagination-100-rows').click();
    return this.page.testSubj.locator('userRow').all();
  }

  async getUserRowData(row: Locator): Promise<UserRowData> {
    const username = await row.locator('[data-test-subj="userRowUserName"]').innerText();
    const fullname = await row.locator('[data-test-subj="userRowFullName"]').innerText();
    const email = await row.locator('[data-test-subj="userRowEmail"]').innerText();
    const rolesText = await row.locator('[data-test-subj="userRowRoles"]').innerText();
    const roles = rolesText.split('\n').map((r) => r.trim()).filter(Boolean);
    const reserved = (await row.locator('[data-test-subj="userReserved"]').count()) > 0;
    const deprecated = (await row.locator('[data-test-subj="userDeprecated"]').count()) > 0;
    const enabled = (await row.locator('[data-test-subj="userDisabled"]').count()) === 0;
    return { username, fullname, email, roles, reserved, deprecated, enabled };
  }

  async getAllUsers(): Promise<UserRowData[]> {
    const paginationButton = this.page.testSubj.locator('tablePaginationPopoverButton');
    await paginationButton.click();
    await this.page.testSubj.locator('tablePagination-100-rows').click();
    const rows = await this.page.testSubj.locator('userRow').all();
    return Promise.all(rows.map((row) => this.getUserRowData(row)));
  }
}
