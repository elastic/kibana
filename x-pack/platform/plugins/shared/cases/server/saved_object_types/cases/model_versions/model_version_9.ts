/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV9 } from '../schemas';

/**
 * Adds the attachments field to the cases SO.
 * Attachments are stored as an embedded array on the case document
 * instead of as separate cases-comments saved objects.
 */
export const modelVersion9: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        attachments: {
          dynamic: false,
          properties: {
            id: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV9.extends({}, { unknowns: 'ignore' }),
  },
};
