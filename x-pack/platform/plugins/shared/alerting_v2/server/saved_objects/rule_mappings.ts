/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the rule saved object.
 */
export const ruleMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: { type: 'text' },
    tags: { type: 'keyword' },
    enabled: { type: 'boolean' },
    schedule: {
      properties: {
        custom: { type: 'keyword' },
      },
    },

    query: { type: 'text' },
    timeField: { type: 'keyword' },
    lookbackWindow: { type: 'keyword' },
    groupingKey: { type: 'keyword' },

    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedBy: { type: 'keyword' },
    updatedAt: { type: 'date' },
  },
};
