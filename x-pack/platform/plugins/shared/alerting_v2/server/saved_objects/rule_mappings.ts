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
        labels: { type: 'keyword' },
      },
    },
    time_field: { type: 'keyword' },
    schedule: {
      properties: {
        every: { type: 'keyword' },
        lookback: { type: 'keyword' },
      },
    },
    evaluation: {
      properties: {
        query: {
          properties: {
            base: { type: 'text' },
            condition: { type: 'text' },
          },
        },
      },
    },
    recovery_policy: {
      properties: {
        type: { type: 'keyword' },
        query: {
          properties: {
            base: { type: 'text' },
            condition: { type: 'text' },
          },
        },
      },
    },
    grouping: {
      properties: {
        fields: { type: 'keyword' },
      },
    },
    no_data: {
      properties: {
        behavior: { type: 'keyword' },
        timeframe: { type: 'keyword' },
      },
    },
    enabled: { type: 'boolean' },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedBy: { type: 'keyword' },
    updatedAt: { type: 'date' },
  },
};
