/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString, isNil } from 'lodash';
import type { StringOrNumberOrBoolean } from '../conditions';

// Painless value encoding utilities.
// Used throughout condition transpilation for encoding values in Painless scripts.

/**
 * Encodes a value for use in Painless scripts.
 * - Strings are wrapped in double quotes
 * - Booleans are converted to 'true' or 'false'
 * - Null/undefined are converted to 'null'
 * - Numbers are returned as-is
 */
export function encodeValue(value: StringOrNumberOrBoolean | null | undefined) {
  if (isString(value)) {
    return `"${value}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  if (isNil(value)) {
    return 'null';
  }

  return value;
}
