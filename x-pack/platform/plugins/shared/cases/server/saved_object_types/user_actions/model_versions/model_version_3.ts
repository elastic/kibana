/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV2, userActionForwardCompatibilitySchemaV2 } from '../schemas';

/**
 * Indexes `payload.origin.type` on workflow user actions so the usage collector can break
 * workflow runs down by the surface they were triggered from. The rest of `origin` stays
 * unmapped under the payload's `dynamic: false` mapping. Mappings-only: the attribute shape is
 * unchanged, so the v2 schemas still apply.
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
                type: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: userActionForwardCompatibilitySchemaV2,
    create: userActionCreateSchemaV2,
  },
};
