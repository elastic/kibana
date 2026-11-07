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

/**
 * Returns the name to use for the role descriptor of a package policy in `output_permissions`.
 *
 * Package policy IDs can be set by API callers (for example the Synthetics project monitors),
 * and a single ID that ES rejects stops Fleet Server from applying the whole agent policy.
 * Valid IDs are returned unchanged so existing role descriptors, and the output permissions
 * hash derived from them, stay the same. Invalid IDs get a readable ASCII prefix plus a hash of
 * the original ID, so the name is deterministic and stays unique per package policy.
 */
export const toRoleDescriptorName = (packagePolicyId: string): string => {
  if (VALID_ROLE_DESCRIPTOR_NAME.test(packagePolicyId)) {
    return packagePolicyId;
  }

  const hash = createHash('sha256').update(packagePolicyId).digest('hex').slice(0, HASH_LENGTH);
  const prefix = packagePolicyId
    .replace(UNSAFE_NAME_CHARS, '_')
    .slice(0, MAX_READABLE_PREFIX_LENGTH);

  return `${prefix}-${hash}`;
};
