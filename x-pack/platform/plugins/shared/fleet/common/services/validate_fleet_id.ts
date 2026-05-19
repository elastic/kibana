/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnsafeId } from '@kbn/human-readable-id';

/**
 * Validates ids for Fleet saved objects
 * Wraps @kbn/human-readable-id validator to enforce length, and special character / key restrictions
 */
export const validateFleetSavedObjectId = (value: string | undefined): string | undefined => {
  if (value === undefined || !isUnsafeId(value)) return;
  return `id is not valid: must be 1–255 characters and must not contain path separators ("/"), traversal sequences (".."), or reserved keys ("__proto__", "constructor", "prototype").`;
};
