/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Infers the field type from a value to determine the field icon
 */
export function inferFieldType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (Array.isArray(value)) {
    return inferFieldType(value[0]);
  }

  if (typeof value === 'string') {
    // Check if it looks like a date
    if (!isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'date';
    }
    return 'string';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'long' : 'double';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'string';
}
