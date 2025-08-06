/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: For prototype purposes, using 'any' types to avoid spending time on complex document structure typing.
// In production, these should be properly typed based on the specific document structures being flattened.

/**
 * Flattens a nested object into dot notation keys
 * Example: { attributes: { service: { name: "test" } } } becomes { "attributes.service.name": "test" }
 */
export function flattenDocument(
  obj: any,
  prefix = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value.constructor === Object
      ) {
        // Recursively flatten nested objects
        flattenDocument(value, newKey, result);
      } else {
        // Store the flattened key-value pair
        result[newKey] = value;
      }
    }
  }

  return result;
}

/**
 * Extracts string field paths from a flattened document
 * Only returns paths that have string values (potential dimensions)
 */
export function getStringFieldPaths(flatDocument: Record<string, any>): string[] {
  return Object.entries(flatDocument)
    .filter(([_, value]) => typeof value === 'string')
    .map(([key, _]) => key);
}
