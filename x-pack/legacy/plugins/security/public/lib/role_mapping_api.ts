/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { INTERNAL_API_BASE_PATH } from '../../common/constants';
import { RoleMapping } from '../../common/model';

interface CheckPrivilegesResponse {
  canManageRoleMappings: boolean;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  hasCompatibleRealms: boolean;
}

type DeleteRoleMappingsResponse = Array<{
  name: string;
  success: boolean;
  error?: Error;
}>;

const roleMappingUrl = `${INTERNAL_API_BASE_PATH}/role_mapping`;

export class RoleMappingApi {
  public static async getRoleMappingFeatures(): Promise<CheckPrivilegesResponse> {
    return kfetch({ pathname: `${roleMappingUrl}_feature_check` });
  }

  public static async getRoleMappings(): Promise<RoleMapping[]> {
    return kfetch({ pathname: roleMappingUrl });
  }

  public static async getRoleMapping(name: string): Promise<RoleMapping> {
    return kfetch({ pathname: `${roleMappingUrl}/${encodeURIComponent(name)}` });
  }

  public static async saveRoleMapping(roleMapping: RoleMapping) {
    const payload = { ...roleMapping };
    delete payload.name;

    return kfetch({
      pathname: `${roleMappingUrl}/${encodeURIComponent(roleMapping.name)}`,
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async deleteRoleMappings(names: string[]): Promise<DeleteRoleMappingsResponse> {
    return Promise.all(
      names.map(name =>
        kfetch({ pathname: `${roleMappingUrl}/${encodeURIComponent(name)}`, method: 'DELETE' })
          .then(() => ({ success: true, name }))
          .catch(error => ({ success: false, name, error }))
      )
    );
  }
}
