/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';

const packQuerySchemaV1 = schema.object(
  {
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    interval: schema.maybe(schema.string()),
    timeout: schema.maybe(schema.number()),
    platform: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    ecs_mapping: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

const packSchemaV1 = schema.object(
  {
    description: schema.maybe(schema.string()),
    name: schema.maybe(schema.string()),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.string()),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.string()),
    enabled: schema.maybe(schema.boolean()),
    shards: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    version: schema.maybe(schema.number()),
    queries: schema.maybe(schema.arrayOf(packQuerySchemaV1)),
  },
  { unknowns: 'allow' }
);

const packQuerySchemaV2 = schema.object(
  {
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    interval: schema.maybe(schema.string()),
    timeout: schema.maybe(schema.number()),
    platform: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    schedule_id: schema.maybe(schema.string()),
    start_date: schema.maybe(schema.string()),
    ecs_mapping: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

const packSchemaV2 = schema.object(
  {
    description: schema.maybe(schema.string()),
    name: schema.maybe(schema.string()),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.string()),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.string()),
    enabled: schema.maybe(schema.boolean()),
    shards: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    version: schema.maybe(schema.number()),
    queries: schema.maybe(schema.arrayOf(packQuerySchemaV2)),
  },
  { unknowns: 'allow' }
);

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
        queries: {
          properties: {
            schedule_id: { type: 'keyword' },
            start_date: { type: 'date' },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: packSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: packSchemaV2,
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
