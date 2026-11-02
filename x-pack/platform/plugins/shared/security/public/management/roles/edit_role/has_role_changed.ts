/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, mapValues, omitBy } from 'lodash';

import type { Role } from '../../../../common';

const isBlank = (value: unknown) =>
  value == null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value!).length === 0);

/**
 * Puts a role into a shape that can be compared for equality:
 *
 * - Privilege lists are sets, but the form appends to them as the user makes selections, so the
 *   same set of privileges can come back in a different order (e.g. after removing a cluster
 *   privilege and adding it back). String arrays are therefore sorted.
 * - The form fills in blank values as the user interacts with it — clearing the description leaves
 *   `undefined` where the role had `''`, an untouched index privilege has empty `names` and
 *   `privileges` — none of which are changes. Blank values are therefore dropped.
 */
const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const items = value.map(normalize);
    return items.every((item) => typeof item === 'string')
      ? [...(items as string[])].sort()
      : items;
  }

  if (value && typeof value === 'object') {
    return omitBy(mapValues(value as Record<string, unknown>, normalize), isBlank);
  }

  return value;
};

/**
 * Determines whether the user has made any changes to the role they are editing, ignoring the
 * values that the form fills in on their behalf.
 */
export const hasRoleChanged = (initialRole: Role, role: Role): boolean =>
  !isEqual(normalize(initialRole), normalize(role));
