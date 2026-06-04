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
    kind: { type: 'keyword' },
    metadata: {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
        owner: { type: 'keyword' },
        tags: { type: 'keyword' },
      },
    },
    time_field: { type: 'keyword' },
    schedule: {
      properties: {
        every: { type: 'keyword' },
        lookback: { type: 'keyword' },
      },
    },
    recovery_strategy: { type: 'keyword' },
    no_data_strategy: { type: 'keyword' },
    query: {
      properties: {
        format: { type: 'keyword' },
        base: { type: 'text' },
        breach: {
          properties: {
            segment: { type: 'text' },
            query: { type: 'text' },
          },
        },
        recovery: {
          properties: {
            segment: { type: 'text' },
            query: { type: 'text' },
          },
        },
        no_data: {
          properties: {
            query: { type: 'text' },
          },
        },
      },
    },
    grouping: {
      properties: {
        fields: { type: 'keyword' },
      },
    },
    enabled: { type: 'boolean' },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedBy: { type: 'keyword' },
    updatedAt: { type: 'date' },
  },
};
