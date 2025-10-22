/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveType, FieldType, TypeofPlaceholder } from './types';

const PRIMITIVE_TYPES: readonly PrimitiveType[] = ['string', 'number', 'boolean', 'date'];

/**
 * Check if a type is a primitive type.
 */
export function isPrimitiveType(type: FieldType): type is PrimitiveType {
  return PRIMITIVE_TYPES.includes(type as PrimitiveType);
}

/**
 * Check if a type is a typeof placeholder.
 */
export function isTypeofPlaceholder(type: FieldType): type is TypeofPlaceholder {
  return type.startsWith('typeof_');
}

/**
 * Normalize Elasticsearch/Grok types to primitive types.
 * - keyword → string
 * - int, long, float → number
 * - date → date
 * - boolean → boolean
 */
export function normalizeToPrimitive(esType: string): PrimitiveType {
  switch (esType.toLowerCase()) {
    case 'keyword':
    case 'text':
    case 'string':
      return 'string';
    case 'int':
    case 'long':
    case 'float':
    case 'double':
    case 'integer':
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
    case 'bool':
      return 'boolean';
    default:
      // For unknown types, default to string
      return 'string';
  }
}

/**
 * Create a typeof placeholder for a field name.
 */
export function createTypeofPlaceholder(fieldName: string): TypeofPlaceholder {
  return `typeof_${fieldName}`;
}

/**
 * Merge two typeof placeholders into a single merged placeholder.
 * Example: typeof_a + typeof_b = typeof_a,b
 */
export function mergeTypeofPlaceholders(
  type1: TypeofPlaceholder,
  type2: TypeofPlaceholder
): TypeofPlaceholder {
  const fields1 = extractFieldsFromPlaceholder(type1);
  const fields2 = extractFieldsFromPlaceholder(type2);

  // Combine and deduplicate field names
  const uniqueFields = new Set([...fields1, ...fields2]);
  const allFields = Array.from(uniqueFields);
  allFields.sort(); // Sort for consistency

  return `typeof_${allFields.join(',')}`;
}

/**
 * Extract field names from a typeof placeholder.
 * Example: "typeof_a,b,c" → ["a", "b", "c"]
 */
export function extractFieldsFromPlaceholder(placeholder: TypeofPlaceholder): string[] {
  const withoutPrefix = placeholder.replace(/^typeof_/, '');
  return withoutPrefix.split(',').map((f) => f.trim());
}

/**
 * Infer primitive type from a JavaScript value.
 */
export function inferTypeFromValue(value: unknown): PrimitiveType {
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  // Default to string for unknown values
  return 'string';
}
