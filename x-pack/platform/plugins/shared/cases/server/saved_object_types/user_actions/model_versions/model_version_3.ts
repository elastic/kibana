/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV3, userActionForwardCompatibilitySchemaV3 } from '../schemas';

/**
 * Indexes `payload.origin.type` and `payload.origin.attachmentType` on workflow user actions so
 * the usage collector can break workflow runs down by the surface they were triggered from and,
 * for attachment surfaces, by attachment type. The rest of `origin` stays unmapped under the
 * payload's `dynamic: false` mapping.
 */
export const modelVersion3: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        payload: {
          properties: {
            origin: {
              properties: {
                type: { type: 'keyword', ignore_above: 1024 },
                attachmentType: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: userActionForwardCompatibilitySchemaV3,
    create: userActionCreateSchemaV3,
  },
};
