/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal privileges only exist for top-level privileges, as "minimal" means a privilege without
 * any associated sub-feature privileges. Currently, sub-feature privileges cannot include or be
 * associated with other sub-feature privileges. We use "minimal" privileges under the hood when
 * admins customize sub-feature privileges for a given top-level privilege. We have only
 * `minimal_all` and `minimal_read` minimal privileges.
 *
 * For example, let’s assume we have a feature Alpha with `All` and `Read` top-level privileges, and
 * `Sub-alpha-1` and `Sub-alpha-2` sub-feature privileges, which are **by default included** in the
 * `All` top-level privilege. When an admin toggles the `All` privilege for feature Alpha and
 * doesn’t change anything else, the resulting role will only have the `feature-alpha.all`
 * privilege, which assumes/includes both `sub-alpha-1` and `sub-alpha-2`. However, if the admin
 * decides to customize sub-feature privileges and toggles off `Sub-alpha-2`, the resulting role
 * will include `feature-alpha.minimal_all` and `feature-alpha.sub-alpha-1` thus excluding
 * `feature-alpha.sub-alpha-2` that's included in `feature-alpha.all`, but not in
 * `feature-alpha.minimal_all`.
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
