/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV4, userActionForwardCompatibilitySchemaV4 } from '../schemas';

/**
 * Indexes `payload.comment.parent_id` so threaded replies can be filtered out of the activity feed.
 */
export const modelVersion4: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        payload: {
          properties: {
            comment: {
              properties: {
                parent_id: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: userActionForwardCompatibilitySchemaV4,
    create: userActionCreateSchemaV4,
  },
};
