/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { ruleSavedObjectAttributesSchemaV1 } from '../schemas/rule_saved_object_attributes';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
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
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
};
