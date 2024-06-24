/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if the given privilege ID is a minimal feature privilege.
 * @param privilegeId The privilege ID to check.
 */
export function isMinimalPrivilegeId(privilegeId: string) {
  return privilegeId === 'minimal_all' || privilegeId === 'minimal_read';
}

/**
 * Returns the minimal privilege ID for the given privilege ID.
 * @param privilegeId The privilege ID to get the minimal privilege ID for. Only `all` and `read`
 * privileges have "minimal" equivalents.
 */
export function getMinimalPrivilegeId(privilegeId: string) {
  if (isMinimalPrivilegeId(privilegeId)) {
    return privilegeId;
  }

  if (privilegeId !== 'read' && privilegeId !== 'all') {
    throw new Error(
      `Minimal privileges are only available for "read" and "all" privileges, but "${privilegeId}" was provided.`
    );
  }

  return `minimal_${privilegeId}`;
}
