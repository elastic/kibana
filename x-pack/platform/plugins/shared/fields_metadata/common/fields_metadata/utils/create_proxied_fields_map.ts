/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMetadata } from '../models/field_metadata';
import type { FieldsMetadataMap } from '../models/fields_metadata_dictionary';
import type { PartialFieldMetadataPlain } from '../types';

export const SUPPORTED_PREFIXES = ['resource.attributes.', 'attributes.'] as const;

interface ExtractedParts {
  prefix: string | null;
  fieldNameWithoutPrefix: string;
}

/**
 * Extracts prefix and base field name from a potentially prefixed field name.
 * Supports: 'attributes.*' and 'resource.attributes.*'
 */
export function extractPrefixParts(fieldName: string): ExtractedParts {
  for (const prefix of SUPPORTED_PREFIXES) {
    if (fieldName.startsWith(prefix)) {
      return {
        prefix,
        fieldNameWithoutPrefix: fieldName.slice(prefix.length),
      };
    }
  }

  return {
    prefix: null,
    fieldNameWithoutPrefix: fieldName,
  };
}

/**
 * Generic proxy creator for field objects (works with both FieldMetadata and plain objects)
 */
function createGenericProxiedFields<T extends { name?: string; flat_name?: string }>(
  fields: Record<string, T>,
  createPrefixedField: (baseField: T, prefixedName: string) => T
): Record<string, T> {
  return new Proxy(fields, {
    get(fieldsMap: Record<string, T>, fieldName: string | symbol): T | undefined {
      // Pass through non-string keys (like Symbol.iterator, etc.)
      if (typeof fieldName !== 'string') {
        return Reflect.get(fieldsMap, fieldName);
      }

      // If field exists directly, return it
      if (fieldName in fieldsMap) {
        return fieldsMap[fieldName];
      }

      // Try to extract prefix and find base field
      const { prefix, fieldNameWithoutPrefix } = extractPrefixParts(fieldName);

      if (prefix && fieldNameWithoutPrefix in fieldsMap) {
        const baseField = fieldsMap[fieldNameWithoutPrefix];
        return createPrefixedField(baseField, fieldName);
      }

      // Field not found, return undefined
      return undefined;
    },

    has(fieldsMap: Record<string, T>, fieldName: string | symbol): boolean {
      if (typeof fieldName !== 'string') {
        return Reflect.has(fieldsMap, fieldName);
      }

      // Check direct existence
      if (fieldName in fieldsMap) {
        return true;
      }

      // Check if prefixed variant can be created
      const { prefix, fieldNameWithoutPrefix } = extractPrefixParts(fieldName);
      return !!(prefix && fieldNameWithoutPrefix in fieldsMap);
    },

    ownKeys(fieldsMap: Record<string, T>): (string | symbol)[] {
      // Return only the base fields - don't enumerate all possible prefixed variants
      // to avoid triplicating the payload
      return Reflect.ownKeys(fieldsMap);
    },

    getOwnPropertyDescriptor(
      fieldsMap: Record<string, T>,
      fieldName: string | symbol
    ): PropertyDescriptor | undefined {
      if (typeof fieldName !== 'string') {
        return Reflect.getOwnPropertyDescriptor(fieldsMap, fieldName);
      }

      // For direct fields, use normal descriptor
      if (fieldName in fieldsMap) {
        return Reflect.getOwnPropertyDescriptor(fieldsMap, fieldName);
      }

      // For prefixed fields that can be created, return a descriptor
      const { prefix, fieldNameWithoutPrefix } = extractPrefixParts(fieldName);
      if (prefix && fieldNameWithoutPrefix in fieldsMap) {
        return {
          configurable: true,
          enumerable: false, // Don't enumerate to avoid payload bloat
          writable: false,
        };
      }

      return undefined;
    },
  });
}

/**
 * Creates a proxied fields map that dynamically handles prefixed field lookups for FieldMetadata instances.
 * When accessing a field like 'resource.attributes.service.name', if not found,
 * it will look for 'service.name' and create a prefixed variant on-the-fly.
 *
 * This ensures consistent behavior between getByName() and find() methods
 * without triplicating the payload with all prefix variants.
 */
export function createProxiedFieldsMap(fields: FieldsMetadataMap): FieldsMetadataMap {
  return createGenericProxiedFields(fields, (baseField, prefixedName) => {
    const plainField = baseField.toPlain();
    return FieldMetadata.create({
      ...plainField,
      name: prefixedName,
      flat_name: prefixedName,
    });
  });
}

/**
 * Creates a proxied fields map for plain field metadata objects (used on client-side).
 * Works the same way as createProxiedFieldsMap but for plain objects instead of FieldMetadata instances.
 */
export function createProxiedPlainFields(
  fields: Record<string, PartialFieldMetadataPlain>
): Record<string, PartialFieldMetadataPlain> {
  return createGenericProxiedFields(fields, (baseField, prefixedName) => ({
    ...baseField,
    name: prefixedName,
    flat_name: prefixedName,
  }));
}
