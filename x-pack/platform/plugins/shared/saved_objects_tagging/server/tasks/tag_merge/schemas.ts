/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const tagMergeTaskParamsSchema = schema.object({
  toId: schema.string(),
  fromIds: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 50 }),
  deleteSources: schema.boolean(),
});

export type TagMergeTaskParams = TypeOf<typeof tagMergeTaskParamsSchema>;

const mergeDeletionResultSchema = schema.object({
  id: schema.string(),
  deleted: schema.boolean(),
  remainingReferences: schema.maybe(schema.number()),
  error: schema.maybe(schema.string()),
});

const tagMergeTaskStateSchemaV1 = schema.object({
  status: schema.oneOf([
    schema.literal('in_progress'),
    schema.literal('canceled'),
    schema.literal('success'),
    schema.literal('failed'),
  ]),
  phase: schema.oneOf([
    schema.literal('scanning'),
    schema.literal('updating'),
    schema.literal('finalizing'),
    schema.literal('complete'),
  ]),
  startedAt: schema.string(),
  totalAffected: schema.maybe(schema.number()),
  updatedCount: schema.number({ defaultValue: 0 }),
  cancelRequested: schema.boolean({ defaultValue: false }),
  deletion: schema.arrayOf(mergeDeletionResultSchema, { defaultValue: [] }),
  errors: schema.object({
    count: schema.number({ defaultValue: 0 }),
    samples: schema.arrayOf(schema.string(), { defaultValue: [] }),
  }),
});

export type TagMergeTaskState = TypeOf<typeof tagMergeTaskStateSchemaV1>;

export const tagMergeTaskStateSchemaByVersion = {
  1: {
    schema: tagMergeTaskStateSchemaV1,
    up: (state: Record<string, unknown>) => state,
  },
};

export const initialTagMergeTaskState = (): TagMergeTaskState => ({
  status: 'in_progress',
  phase: 'scanning',
  startedAt: new Date().toISOString(),
  updatedCount: 0,
  cancelRequested: false,
  deletion: [],
  errors: { count: 0, samples: [] },
});
