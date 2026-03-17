/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import type { MappingsResponse } from '../../../../../../../common';

export interface VectorFieldTypes {
  semantic_text: number;
  dense_vector: number;
  sparse_vector: number;
}

export function countVectorBasedTypesFromMappings(mappings: MappingsResponse): VectorFieldTypes {
  const typeCounts: VectorFieldTypes = {
    semantic_text: 0,
    dense_vector: 0,
    sparse_vector: 0,
  };

  const typeCountKeys = Object.keys(typeCounts);

  function recursiveCount(
    node: MappingsResponse | MappingProperty | MappingPropertyBase['fields']
  ) {
    if (!node) {
      return;
    }
    if ('mappings' in node) {
      recursiveCount(node.mappings);
    }

    const visitEntries = (entries: Record<string, MappingProperty>) => {
      Object.keys(entries).forEach((key) => {
        const value = entries[key];

        if (value && value.type && typeCountKeys.includes(value.type)) {
          const type = value.type as keyof VectorFieldTypes;
          typeCounts[type] = typeCounts[type] + 1;
        }

        if (value) {
          recursiveCount(value);
        }
      });
    };

    if ('properties' in node && node.properties) {
      visitEntries(node.properties as Record<string, MappingProperty>);
    }
    if ('fields' in node && node.fields) {
      visitEntries(node.fields as Record<string, MappingProperty>);
    }
  }

  recursiveCount(mappings);
  return typeCounts;
}
