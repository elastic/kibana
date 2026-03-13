/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { savedQuerySchemaV2, packSchemaV2 } from './schemas';

export const savedQueryModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        timeout: { type: 'short' },
      },
    },
  ],
};

export const savedQueryModelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        created_by_profile_uid: { type: 'keyword' },
        updated_by_profile_uid: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: savedQuerySchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

export const packSavedObjectModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        queries: {
          properties: {
            timeout: { type: 'short' },
          },
        },
      },
    },
  ],
};

export const packSavedObjectModelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        created_by_profile_uid: { type: 'keyword' },
        updated_by_profile_uid: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: packSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

export const packAssetSavedObjectModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        queries: {
          properties: {
            timeout: { type: 'short' },
          },
        },
      },
    },
  ],
};
