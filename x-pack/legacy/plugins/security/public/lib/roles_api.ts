/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { Role } from '../../common/model/role';

export class RolesApi {
  public static async getRoles(): Promise<Role[]> {
    return kfetch({ pathname: '/api/security/role' });
  }

  public static async getRole(roleName: string): Promise<Role> {
    return kfetch({ pathname: `/api/security/role/${encodeURIComponent(roleName)}` });
  }

  public static async deleteRole(roleName: string) {
    return kfetch({
      pathname: `/api/security/role/${encodeURIComponent(roleName)}`,
      method: 'DELETE',
    });
  }
}
