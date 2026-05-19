/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnsafeId } from '@kbn/human-readable-id';

/**
 * Config-schema `validate` function that rejects ids containing path
 * separators, traversal sequences, prototype-pollution keys, empty strings, or
 * values longer than 255 characters. Permissive of KQL-special chars (colons,
 * spaces, wildcards) — those are handled at every KQL interpolation site via
 * escapeKuery / escapeQuotes.
 *
 * Only wire into *create* request schemas, not read/response schemas, so that
 * pre-existing stored IDs continue to function (backward compatibility).
 */
export const validateFleetSavedObjectId = (value: string | undefined): string | undefined => {
  if (value === undefined || !isUnsafeId(value)) return;
  return `id is not valid: must be 1–255 characters and must not contain path separators ("/"), traversal sequences (".."), or reserved keys ("__proto__", "constructor", "prototype").`;
};
