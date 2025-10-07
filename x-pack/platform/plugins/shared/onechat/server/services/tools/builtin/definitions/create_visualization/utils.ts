/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema } from './types';

export const fixArraySchemas = (schema: JsonSchema): JsonSchema => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // If type is an array of schemas (not a type array like ["string", "null"]),
  // this is non-standard and we should handle it specially
  if (Array.isArray(schema.type) && schema.type.length > 0 && typeof schema.type[0] === 'object') {
    // This is a non-standard case - skip type modification for now
    return schema;
  }

  // Handle arrays - ensure they have items property
  if (schema.type === 'array' && !schema.items) {
    return {
      ...schema,
      items: {},
    };
  }

  // Handle arrays defined as ["array", ...] union types
  if (Array.isArray(schema.type) && schema.type.includes('array') && !schema.items) {
    // Remove 'array' from the type union since we can't properly define it without items
    const filteredTypes = schema.type.filter((t: string) => t !== 'array');
    return {
      ...schema,
      type: filteredTypes.length === 1 ? filteredTypes[0] : filteredTypes,
    };
  }

  // Recursively fix properties
  if (schema.properties) {
    const fixedProperties: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      fixedProperties[key] = fixArraySchemas(value);
    }
    schema = { ...schema, properties: fixedProperties };
  }

  // Recursively fix anyOf/oneOf/allOf
  if (schema.anyOf) {
    schema = { ...schema, anyOf: schema.anyOf.map(fixArraySchemas) };
  }
  if (schema.oneOf) {
    schema = { ...schema, oneOf: schema.oneOf.map(fixArraySchemas) };
  }
  if (schema.allOf) {
    schema = { ...schema, allOf: schema.allOf.map(fixArraySchemas) };
  }

  // Recursively fix items
  if (schema.items) {
    schema = { ...schema, items: fixArraySchemas(schema.items) };
  }

  return schema;
};
