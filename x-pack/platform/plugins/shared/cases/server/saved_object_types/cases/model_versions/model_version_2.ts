/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV2 } from '../schemas';

export const modelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        observables: {
          type: 'nested',
          properties: {
            typeKey: {
              type: 'keyword',
            },
            value: {
              type: 'keyword',
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};
