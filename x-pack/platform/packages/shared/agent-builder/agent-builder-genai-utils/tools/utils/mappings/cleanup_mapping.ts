/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Cleanup the given index mapping, removing info supposedly not relevant to an LLM,
 * such as `ignore_above` and such, to reduce the overall token length of response.
 */
export const cleanupMapping = (mapping: MappingTypeMapping): MappingTypeMapping => {
  const recurseKeys = ['properties', 'fields'];
  const fieldsToKeep = [
    'type',
    'dynamic',
    '_meta',
    'meta',
    'briefing',
    'description',
    'index',
    'enabled',
  ];

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
