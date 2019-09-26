/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { Role } from '../../../common/model';
import { copyRole } from '../../lib/role_utils';
import { transformRoleForSave } from '../../lib/transform_role_for_save';

const apiBase = chrome.addBasePath(`/api/security/role`);

export async function saveRole($http: any, role: Role, spacesEnabled: boolean) {
  const data = transformRoleForSave(copyRole(role), spacesEnabled);

  return await $http.put(`${apiBase}/${role.name}`, data);
}

export async function deleteRole($http: any, name: string) {
  return await $http.delete(`${apiBase}/${name}`);
}
