/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { AuthenticatedUser, Role, User, EditUser } from '../../common/model';

const usersUrl = '/internal/security/users';
const rolesUrl = '/api/security/role';

export class UserAPIClient {
  public async getCurrentUser(): Promise<AuthenticatedUser> {
    return await kfetch({ pathname: `/internal/security/me` });
  }

  public async getUsers(): Promise<User[]> {
    return await kfetch({ pathname: usersUrl });
  }

  public async getUser(username: string): Promise<User> {
    const url = `${usersUrl}/${encodeURIComponent(username)}`;
    return await kfetch({ pathname: url });
  }

  public async deleteUser(username: string) {
    const url = `${usersUrl}/${encodeURIComponent(username)}`;
    await kfetch({ pathname: url, method: 'DELETE' }, {});
  }

  public async saveUser(user: EditUser) {
    const url = `${usersUrl}/${encodeURIComponent(user.username)}`;

    await kfetch({ pathname: url, body: JSON.stringify(user), method: 'POST' });
  }

  public async getRoles(): Promise<Role[]> {
    return await kfetch({ pathname: rolesUrl });
  }

  public async getRole(name: string): Promise<Role> {
    const url = `${rolesUrl}/${encodeURIComponent(name)}`;
    return await kfetch({ pathname: url });
  }

  public async changePassword(username: string, password: string, currentPassword: string) {
    const data: Record<string, string> = {
      newPassword: password,
    };
    if (currentPassword) {
      data.password = currentPassword;
    }
    await kfetch({
      pathname: `${usersUrl}/${encodeURIComponent(username)}/password`,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
