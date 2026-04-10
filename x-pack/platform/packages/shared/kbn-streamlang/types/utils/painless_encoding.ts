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
 * Escapes a string for use in a Painless double-quoted string literal.
 * Painless only supports \\ and \" as escape sequences in double-quoted strings.
 * Control characters must be escaped using Unicode escapes.
 */
function escapePainlessString(str: string): string {
  let result = '';
  for (const char of str) {
    switch (char) {
      case '\\':
        result += '\\\\';
        break;
      case '"':
        result += '\\"';
        break;
      case '\n':
        result += '\\u000A';
        break;
      case '\r':
        result += '\\u000D';
        break;
      case '\t':
        result += '\\u0009';
        break;
      default:
        result += char;
    }
  }
  return result;
}

/**
 * Encodes a value for use in Painless scripts.
 * - Strings are wrapped in double quotes with proper escaping
 * - Booleans are converted to 'true' or 'false'
 * - Null/undefined are converted to 'null'
 * - Numbers are returned as-is
 */
export function encodeValue(value: StringOrNumberOrBoolean | null | undefined) {
  if (isString(value)) {
    return `"${escapePainlessString(value)}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  if (isNil(value)) {
    return 'null';
  }

  return value;
}
