/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import { casesSchemaV14 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

// Core merges the result over the stored attributes, so a case that already has `access` is left
// alone. Builds of the restricted-cases work wrote `access` under a lower model version; resetting
// those cases to `default` would make restricted cases visible to everyone.
const backfillAccess: SavedObjectModelDataBackfillFn<{ access?: unknown }> = (doc) =>
  doc.attributes.access == null
    ? { attributes: { access: { mode: 'default' } } }
    : { attributes: {} };

/**
 * Adds the `access.mode` keyword mapping and backfills `{ mode: 'default' }`
 * so every pre-existing case is explicitly non-restricted. Readers still
 * treat a missing value as `default`.
 */
export const modelVersion14: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        access: {
          properties: {
            mode: {
              type: 'keyword',
            },
          },
        },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: backfillAccess,
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV14.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV14.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
