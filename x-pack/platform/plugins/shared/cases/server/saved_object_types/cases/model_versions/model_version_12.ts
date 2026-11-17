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
 * Adds the `merged_into` keyword mapping, holding the ids of the cases a case was merged into.
 * Existing cases have no value, which reads as not merged.
 */
export const modelVersion12: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        merged_into: {
          type: 'keyword',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV12.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV12.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
