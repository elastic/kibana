/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin-types-common';

/**
 * Roles in the listing must be sorted so that custom roles appear in the beginning
 * and reserved roles appear at the end
 */
export function sortRolesForListing(aRole: Role, bRole: Role) {
  const { name: aName, metadata: aMeta } = aRole;
  const { name: bName, metadata: bMeta } = bRole;
  const aReserved = aMeta?._reserved ?? false;
  const bReserved = bMeta?._reserved ?? false;

  if (aReserved && !bReserved) {
    return 1;
  }
  if (!aReserved && bReserved) {
    return -1;
  }

  return aName.localeCompare(bName);
}
