/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * Elasticsearch only accepts API key role descriptor names made of printable ASCII, with no
 * leading or trailing whitespace. Any other name fails the whole API key request.
 */
const VALID_ROLE_DESCRIPTOR_NAME = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/;

const UNSAFE_NAME_CHARS = /[^A-Za-z0-9._-]+/g;
const MAX_READABLE_PREFIX_LENGTH = 64;
const HASH_LENGTH = 16;

const generateRoleDescriptorName = (packagePolicyId: string, attempt: number): string => {
  const hashInput = attempt === 0 ? packagePolicyId : `${packagePolicyId}\u0000${attempt}`;
  const hash = createHash('sha256').update(hashInput).digest('hex').slice(0, HASH_LENGTH);
  const prefix = packagePolicyId
    .replace(UNSAFE_NAME_CHARS, '_')
    .slice(0, MAX_READABLE_PREFIX_LENGTH);

  return `${prefix}-${hash}`;
};

/**
 * Returns the role descriptor names to use in `output_permissions` for the given package policy
 * IDs of one agent policy, in the same order.
 *
 * Package policy IDs can be set by API callers (for example the Synthetics project monitors),
 * and a single ID that ES rejects stops Fleet Server from applying the whole agent policy.
 * Valid IDs are returned unchanged so existing role descriptors, and the output permissions
 * hash derived from them, stay the same. Invalid IDs get a readable ASCII prefix plus a hash of
 * the original ID.
 *
 * A generated name is itself a valid ID, so another package policy can legitimately use it. Valid
 * IDs are therefore reserved first, and a generated name that is already taken is regenerated, so
 * two package policies never share a name and silently lose permissions. Invalid IDs are handled
 * in sorted order so the result does not depend on the order of the package policies.
 */
export const getRoleDescriptorNames = (packagePolicyIds: string[]): string[] => {
  const takenNames = new Set(packagePolicyIds.filter((id) => VALID_ROLE_DESCRIPTOR_NAME.test(id)));
  const invalidIds = [
    ...new Set(packagePolicyIds.filter((id) => !VALID_ROLE_DESCRIPTOR_NAME.test(id))),
  ].sort();

  const generatedNames = new Map<string, string>();
  for (const id of invalidIds) {
    let attempt = 0;
    let name = generateRoleDescriptorName(id, attempt);
    while (takenNames.has(name)) {
      attempt += 1;
      name = generateRoleDescriptorName(id, attempt);
    }
    takenNames.add(name);
    generatedNames.set(id, name);
  }

  return packagePolicyIds.map((id) => generatedNames.get(id) ?? id);
};
