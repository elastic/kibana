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
        name: { type: 'text' },
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
    // Objects that don't need to be searched/filtered are stored opaque.
    recovery_policy: { type: 'object', enabled: false },
    state_transition: { type: 'object', enabled: false },
    grouping: {
      properties: {
        fields: { type: 'keyword' },
      },
    },
    no_data: { type: 'object', enabled: false },
    notification_policies: { type: 'object', enabled: false },

    enabled: { type: 'boolean' },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedBy: { type: 'keyword' },
    updatedAt: { type: 'date' },
  },
};
