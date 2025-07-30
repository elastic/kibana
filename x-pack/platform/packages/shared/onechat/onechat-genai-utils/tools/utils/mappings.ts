/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping, MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export type FieldType = Extract<MappingProperty, { type: string }>['type'];

export interface MappingField {
  path: string;
  type: FieldType;
}

interface MappingProperties {
  [key: string]: {
    type?: string; // Leaf field (e.g., "text", "keyword", etc.)
    properties?: MappingProperties; // Nested object fields
  };
}

/**
 * Returns a flattened representation of the mappings, with all fields at the top level.
 */
export const flattenMappings = ({ mappings }: { mappings: MappingTypeMapping }): MappingField[] => {
  const properties: MappingProperties = mappings.properties ?? {};

  function extractFields(obj: MappingProperties, prefix = ''): MappingField[] {
    let fields: MappingField[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;

      if (value.type) {
        // If it's a leaf field, add it
        fields.push({
          type: value.type as FieldType,
          path: fieldPath,
        });
      } else if (value.properties) {
        // If it's an object, go deeper
        fields = fields.concat(extractFields(value.properties, fieldPath));
      }
    }

    return fields;
  }

  return extractFields(properties);
};

/**
 * Remove non-relevant mapping information such as `ignore_above` to reduce overall token length of response
 * @param mapping
 */
export const cleanupMapping = (mapping: MappingTypeMapping): MappingTypeMapping => {
  const recurseKeys = ['properties', 'fields'];
  const fieldsToKeep = ['type', 'dynamic', '_meta', 'enabled'];

  function recursiveCleanup(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map((item) => recursiveCleanup(item));
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, any> = {};

      for (const key of Object.keys(obj)) {
        if (recurseKeys.includes(key)) {
          const value = obj[key];
          if (value !== null && typeof value === 'object') {
            // For properties/fields: preserve all keys inside
            const subCleaned: Record<string, any> = {};
            for (const fieldName of Object.keys(value)) {
              subCleaned[fieldName] = recursiveCleanup(value[fieldName]);
            }
            cleaned[key] = subCleaned;
          }
        } else if (fieldsToKeep.includes(key)) {
          cleaned[key] = recursiveCleanup(obj[key]);
        }
      }

      return cleaned;
    } else {
      return obj;
    }
  }

  return recursiveCleanup(mapping);
};
