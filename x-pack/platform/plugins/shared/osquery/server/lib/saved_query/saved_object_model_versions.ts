/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';

// These schemas mirror the TypeScript types in server/common/types.ts (PackSavedObject, SOShard)
// and server/routes/pack/utils.ts (SOPackQuery). Keep them in sync.

// Stored as array via convertECSMappingToArray; accept object for legacy compat
const ecsMappingSchema = schema.maybe(
  schema.oneOf([
    schema.object({}, { unknowns: 'allow' }),
    schema.arrayOf(schema.object({}, { unknowns: 'allow' })),
  ])
);

// Stored as array via convertShardsToArray (SOShard); accept object for legacy compat
const shardsSchema = schema.maybe(
  schema.oneOf([
    schema.object({}, { unknowns: 'allow' }),
    schema.arrayOf(schema.object({}, { unknowns: 'allow' })),
  ])
);

// Base pack query fields shared across model versions (matches SOPackQuery)
const packQueryBaseFields = {
  id: schema.maybe(schema.string()),
  query: schema.maybe(schema.string()),
  interval: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  timeout: schema.maybe(schema.number()),
  platform: schema.maybe(schema.string()),
  version: schema.maybe(schema.string()),
  ecs_mapping: ecsMappingSchema,
};

const packQuerySchemaV1 = schema.object(packQueryBaseFields, { unknowns: 'allow' });

const packQuerySchemaV2 = schema.object(
  {
    ...packQueryBaseFields,
    schedule_id: schema.maybe(schema.string()),
    start_date: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

// Builds a pack schema for a given query schema version (matches PackSavedObject)
const buildPackSchema = (querySchema: typeof packQuerySchemaV1) =>
  schema.object(
    {
      description: schema.maybe(schema.string()),
      name: schema.maybe(schema.string()),
      created_at: schema.maybe(schema.string()),
      created_by: schema.maybe(schema.string()),
      updated_at: schema.maybe(schema.string()),
      updated_by: schema.maybe(schema.string()),
      enabled: schema.maybe(schema.boolean()),
      shards: shardsSchema,
      version: schema.maybe(schema.number()),
      queries: schema.maybe(schema.arrayOf(querySchema)),
    },
    { unknowns: 'allow' }
  );

const packSchemaV1 = buildPackSchema(packQuerySchemaV1);
const packSchemaV2 = buildPackSchema(packQuerySchemaV2);

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
