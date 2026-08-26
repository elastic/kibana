/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// `ecs_mapping` lives in two shapes:
// - HTTP request bodies use the record form `{ [field]: { value/field } }`
// - The SO is written via `convertECSMappingToArray`, producing
//   `Array<{ key, value }>` — the canonical on-disk shape since Oct 2021.
// Forward-compat schemas must accept both so they validate on-disk data.
const ecsMappingSchema = schema.oneOf([
  schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' })),
  schema.arrayOf(
    schema.object({
      key: schema.string(),
      value: schema.object({}, { unknowns: 'allow' }),
    }),
    { maxSize: 200 }
  ),
]);

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

// `unknowns: 'allow'` is load-bearing — per-query RRULE overrides round-trip
// through this. Do not tighten to `forbid`.
const packQuerySchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    interval: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
    timeout: schema.maybe(schema.number()),
    platform: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    ecs_mapping: schema.maybe(ecsMappingSchema),
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
      schema.arrayOf(packQuerySchema, { maxSize: 1000 }),
    ])
  ),
  // Pack-asset version (prebuilt-pack version number). Name is taken — a future
  // V4 "min osquery version" field MUST use a different name (e.g.
  // `min_osquery_version`) to avoid type collision with this number field.
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

const rruleScheduleConfigSchema = schema.object(
  {
    rrule: schema.string(),
    start_date: schema.string(),
    end_date: schema.maybe(schema.string()),
    splay: schema.maybe(schema.string()),
    timeout: schema.maybe(schema.number()),
  },
  { unknowns: 'allow' }
);

export const packSchemaV3 = packSchemaV2.extends({
  // Nullable so update routes can clear the prior-mode pack-level field on a
  // schedule_type transition — the SO mapping accepts null and the
  // discriminated read/find responses then drop the slot entirely.
  schedule_type: schema.maybe(
    schema.nullable(schema.oneOf([schema.literal('interval'), schema.literal('rrule')]))
  ),
  interval: schema.maybe(schema.nullable(schema.number())),
  rrule_schedule: schema.maybe(schema.nullable(rruleScheduleConfigSchema)),
});

// V4 adds no new schema surface — new fields live under `queries`, already
// `unknowns: 'allow'`.
export const packSchemaV4 = packSchemaV3;
