/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deeply copies a JSON object, skipping all arrays.
 *
 * @param value - The JSON value to be deeply copied, which can be an array, object, or other types.
 * @returns A new object that is a deep copy of the input value, but with arrays skipped.
 *
 * This function recursively traverses the provided value. If the value is an array, it skips it.
 * If the value is a regular object, it continues traversing its properties and copying them.
 */
export function deepCopySkipArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Skip arrays
    return undefined;
  }

  if (typeof value === 'object' && value !== null) {
    // Regular dictionary, continue traversing.
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const copiedValue = deepCopySkipArrays(v);
      if (copiedValue !== undefined) {
        result[k] = copiedValue;
      }
    }
    return result;
  }

  // For primitive types, return the value as is.
  return value;
}
