/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV3 } from '../schemas';

/**
 * Adds the incremental id to the cases SO.
 */
export const modelVersion3: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        incremental_id: {
          type: 'unsigned_long',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV3.extends({}, { unknowns: 'ignore' }),
  },
};
