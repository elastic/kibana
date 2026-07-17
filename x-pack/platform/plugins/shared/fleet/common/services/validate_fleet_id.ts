/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnsafeId } from '@kbn/human-readable-id';

import { FleetError } from '../errors';

// Characters that are Painless script metacharacters. Fleet Server builds
// Painless update scripts by interpolating the output ID directly into the
// script source (policy_output.go). Allowing these in an ID enables injection
// into the restricted .fleet-agents index via Fleet Server's service account.
// See: https://github.com/elastic/security/issues/12188
const PAINLESS_UNSAFE_CHARS_RE = /["';\\()]/;

/**
 * Throws a FleetError if the id contains path separators, traversal sequences,
 * prototype-pollution keys, Painless script metacharacters, is empty, or
 * exceeds 255 characters. Only call on create paths so pre-existing stored IDs
 * continue to function.
 */
export const validateFleetSavedObjectId = (value: string | undefined): void => {
  if (value === undefined) return;
  if (isUnsafeId(value) || PAINLESS_UNSAFE_CHARS_RE.test(value)) {
    throw new FleetError(
      `id is not valid: must be 1–255 characters and must not contain path separators ("/"), traversal sequences (".."), reserved keys ("__proto__", "constructor", "prototype"), or script-injection characters (", ', ;, \\, (, )).`
    );
  }
};
