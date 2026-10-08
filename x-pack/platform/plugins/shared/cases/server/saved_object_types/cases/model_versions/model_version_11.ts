/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV11 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds the `access.mode` keyword mapping and backfills `{ mode: 'default' }`
 * so every pre-existing case is explicitly non-restricted. Readers still
 * treat a missing value as `default`.
 */
export const modelVersion11: SavedObjectsModelVersion = {
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
      backfillFn: () => {
        return { attributes: { access: { mode: 'default' } } };
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV11.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV11.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
