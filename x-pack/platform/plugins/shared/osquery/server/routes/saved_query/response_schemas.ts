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

const savedQueryDataSchema = schema.object(
  {
    saved_object_id: schema.string(),
    id: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    query: schema.maybe(schema.string()),
    interval: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
    timeout: schema.maybe(schema.nullable(schema.number())),
    snapshot: schema.maybe(schema.nullable(schema.boolean())),
    removed: schema.maybe(schema.nullable(schema.boolean())),
    platform: schema.maybe(schema.nullable(schema.string())),
    ecs_mapping: schema.maybe(
      schema.nullable(
        schema.oneOf([
          schema.recordOf(schema.string(), ecsMappingItemSchema),
          schema.arrayOf(schema.any()),
        ])
      )
    ),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.nullable(schema.string())),
    created_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.nullable(schema.string())),
    updated_by_profile_uid: schema.maybe(schema.nullable(schema.string())),
    prebuilt: schema.maybe(schema.boolean()),
    version: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  },
  { unknowns: 'allow' }
);

export const createSavedQueryResponseSchema = schema.object({
  data: savedQueryDataSchema,
});

export const readSavedQueryResponseSchema = schema.object({
  data: savedQueryDataSchema,
});

export const findSavedQueryResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(savedQueryDataSchema),
});

export const updateSavedQueryResponseSchema = schema.object({
  data: savedQueryDataSchema,
});

// Delete returns an empty body `{}` — no unknowns expected
export const deleteSavedQueryResponseSchema = schema.object({});

export const copySavedQueryResponseSchema = schema.object({
  data: savedQueryDataSchema,
});
