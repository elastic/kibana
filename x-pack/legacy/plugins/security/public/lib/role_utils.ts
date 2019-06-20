/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, get } from 'lodash';
import { Role } from '../../common/model';

/**
 * Returns whether given role is enabled or not
 *
 * @param role Object Role JSON, as returned by roles API
 * @return Boolean true if role is enabled; false otherwise
 */
export function isRoleEnabled(role: Partial<Role>) {
  return get(role, 'transient_metadata.enabled', true);
}

/**
 * Returns whether given role is reserved or not.
 *
 * @param {role} the Role as returned by roles API
 */
export function isReservedRole(role: Partial<Role>) {
  return get(role, 'metadata._reserved', false);
}

/**
 * Returns whether given role is editable through the UI or not.
 *
 * @param role the Role as returned by roles API
 */
export function isReadOnlyRole(role: Partial<Role>): boolean {
  return isReservedRole(role) || !!(role._transform_error && role._transform_error.length > 0);
}

/**
 * Returns a deep copy of the role.
 *
 * @param role the Role to copy.
 */
export function copyRole(role: Role) {
  return cloneDeep(role);
}
