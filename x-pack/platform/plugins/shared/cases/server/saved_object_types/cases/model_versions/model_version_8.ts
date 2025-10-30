/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV8 } from '../schemas';

/**
 * Adds the total_events field to the cases SO.
 */
export const modelVersion8: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        total_observables: {
          type: 'integer',
        },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: (_doc) => {
        return { attributes: { total_observables: 0 } };
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV8.extends({}, { unknowns: 'ignore' }),
  },
};
