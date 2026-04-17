/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const savedQuerySchemaV1 = schema.object({
  id: schema.string(),
  description: schema.maybe(schema.string()),
  query: schema.maybe(schema.string()),
  created_at: schema.maybe(schema.string()),
  created_by: schema.maybe(schema.nullable(schema.string())),
  platform: schema.maybe(schema.string()),
  version: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  updated_at: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.nullable(schema.string())),
  interval: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  timeout: schema.maybe(schema.number()),
  snapshot: schema.maybe(schema.boolean()),
  removed: schema.maybe(schema.boolean()),
  prebuilt: schema.maybe(schema.boolean()),
  ecs_mapping: schema.maybe(
    schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }))
  ),
});

export const savedQuerySchemaV2 = savedQuerySchemaV1.extends({
  created_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
  updated_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
});

const packQuerySchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    interval: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
    timeout: schema.maybe(schema.number()),
    platform: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    ecs_mapping: schema.maybe(
      schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }))
    ),
    snapshot: schema.maybe(schema.boolean()),
    removed: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);

const packSchemaV1 = schema.object({
  name: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  queries: schema.maybe(
    schema.oneOf([
      schema.recordOf(schema.string(), packQuerySchema),
      schema.arrayOf(packQuerySchema),
    ])
  ),
  version: schema.maybe(schema.number()),
  enabled: schema.maybe(schema.boolean()),
  created_at: schema.maybe(schema.string()),
  created_by: schema.maybe(schema.nullable(schema.string())),
  updated_at: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.nullable(schema.string())),
  policy_ids: schema.maybe(schema.arrayOf(schema.string())),
  shards: schema.maybe(
    schema.oneOf([
      schema.recordOf(schema.string(), schema.number()),
      schema.arrayOf(schema.object({ key: schema.string(), value: schema.number() })),
    ])
  ),
});

export const packSchemaV2 = packSchemaV1.extends({
  created_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
  updated_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
});
