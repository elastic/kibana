/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const ecsMappingItemSchema = schema.object(
  {
    field: schema.maybe(schema.string()),
    value: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  },
  { unknowns: 'allow' }
);

const packQuerySchema = schema.object(
  {
    query: schema.maybe(schema.string()),
    id: schema.maybe(schema.string()),
    interval: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
    platform: schema.maybe(schema.nullable(schema.string())),
    version: schema.maybe(schema.nullable(schema.string())),
    snapshot: schema.maybe(schema.nullable(schema.boolean())),
    removed: schema.maybe(schema.nullable(schema.boolean())),
    timeout: schema.maybe(schema.nullable(schema.number())),
    ecs_mapping: schema.maybe(
      schema.nullable(
        schema.oneOf([
          schema.recordOf(schema.string(), ecsMappingItemSchema),
          schema.arrayOf(schema.any()),
        ])
      )
    ),
    saved_query_id: schema.maybe(schema.nullable(schema.string())),
    name: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

const shardItemSchema = schema.object({
  key: schema.string(),
  value: schema.number(),
});

const packDataSchema = schema.object(
  {
    saved_object_id: schema.string(),
    name: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    queries: schema.maybe(
      schema.oneOf([
        schema.recordOf(schema.string(), packQuerySchema),
        schema.arrayOf(packQuerySchema),
      ])
    ),
    version: schema.maybe(schema.number()),
    enabled: schema.maybe(schema.nullable(schema.boolean())),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.nullable(schema.string())),
    created_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.nullable(schema.string())),
    updated_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
    policy_ids: schema.maybe(schema.arrayOf(schema.string())),
    shards: schema.maybe(
      schema.nullable(
        schema.oneOf([
          schema.arrayOf(shardItemSchema),
          schema.recordOf(schema.string(), schema.number()),
        ])
      )
    ),
    read_only: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);

export const createPackResponseSchema = schema.object({
  data: packDataSchema,
});

export const readPackResponseSchema = schema.object({
  data: schema.object(
    {
      saved_object_id: schema.string(),
      name: schema.string(),
      description: schema.maybe(schema.nullable(schema.string())),
      queries: schema.maybe(schema.recordOf(schema.string(), packQuerySchema)),
      version: schema.maybe(schema.number()),
      enabled: schema.maybe(schema.nullable(schema.boolean())),
      created_at: schema.maybe(schema.string()),
      created_by: schema.maybe(schema.nullable(schema.string())),
      created_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
      updated_at: schema.maybe(schema.string()),
      updated_by: schema.maybe(schema.nullable(schema.string())),
      updated_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
      policy_ids: schema.maybe(schema.arrayOf(schema.string())),
      shards: schema.maybe(schema.recordOf(schema.string(), schema.number())),
      read_only: schema.maybe(schema.boolean()),
      type: schema.maybe(schema.string()),
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
      migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
      managed: schema.maybe(schema.boolean()),
      coreMigrationVersion: schema.maybe(schema.string()),
    },
    { unknowns: 'allow' }
  ),
});

export const findPackResponseSchema = schema.object(
  {
    page: schema.number(),
    per_page: schema.number(),
    total: schema.number(),
    data: schema.arrayOf(packDataSchema),
  },
  { unknowns: 'allow' }
);

export const updatePackResponseSchema = schema.object(
  {
    data: schema.any(),
  },
  { unknowns: 'allow' }
);

export const deletePackResponseSchema = schema.object({}, { unknowns: 'allow' });

export const copyPackResponseSchema = schema.object({
  data: packDataSchema,
});
