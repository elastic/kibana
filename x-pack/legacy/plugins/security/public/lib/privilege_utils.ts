/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RoleKibanaPrivilege } from '../../common/model';

/**
 * Determines if the passed privilege spec defines global privileges.
 * @param privilegeSpec
 */
export function isGlobalPrivilegeDefinition(privilegeSpec: RoleKibanaPrivilege): boolean {
  if (!privilegeSpec.spaces || privilegeSpec.spaces.length === 0) {
    return true;
  }
  return privilegeSpec.spaces.includes('*');
}

/**
 * Determines if the passed privilege spec defines feature privileges.
 * @param privilegeSpec
 */
export function hasAssignedFeaturePrivileges(privilegeSpec: RoleKibanaPrivilege): boolean {
  const featureKeys = Object.keys(privilegeSpec.feature);
  return featureKeys.length > 0 && featureKeys.some(key => privilegeSpec.feature[key].length > 0);
}
