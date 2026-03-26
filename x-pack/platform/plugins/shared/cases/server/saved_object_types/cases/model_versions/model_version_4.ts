/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV4 } from '../schemas';

/**
 * Adds the incremental_id.keyword field to the cases SO.
 */
export const modelVersion4: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        incremental_id: {
          type: 'unsigned_long',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV4.extends({}, { unknowns: 'ignore' }),
  },
};
