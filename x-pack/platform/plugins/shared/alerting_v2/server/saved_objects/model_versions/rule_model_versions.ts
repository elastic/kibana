/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
} from '../schemas/rule_saved_object_attributes';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          last_execution: {
            properties: {
              outcome: { type: 'keyword' },
              timestamp: { type: 'date' },
              duration_ms: { type: 'long' },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV2,
    },
  },
};
