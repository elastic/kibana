/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { MappingField } from './types';

interface MappingProperties {
  [key: string]: {
    type?: string; // Leaf field (e.g., "text", "keyword", etc.)
    properties?: MappingProperties; // Nested object fields
    meta?: Record<string, string>; // meta
  };
}

/**
 * Returns a flattened representation of the mappings, with all fields at the top level.
 */
export const flattenMapping = (mapping: MappingTypeMapping): MappingField[] => {
  const properties: MappingProperties = mapping.properties ?? {};

  function extractFields(obj: MappingProperties, prefix = ''): MappingField[] {
    let fields: MappingField[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;

      if (value.type) {
        // If it's a leaf field, add it
        fields.push({
          type: value.type,
          path: fieldPath,
          meta: value.meta ?? {},
        });
      }
      if (value.properties) {
        // If it's an object or has nested props, go deeper
        fields = fields.concat(extractFields(value.properties, fieldPath));
      }
    }

    return fields;
  }

  return extractFields(properties);
};
