/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV12 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds `closed_by_merge`, whether a merge closed the case, and `merged`, whether the case was
 * merged into another case. Existing cases have neither, which reads as never merged.
 */
export const modelVersion12: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        closed_by_merge: {
          type: 'boolean',
        },
        merged: {
          type: 'boolean',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV12.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV12.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
