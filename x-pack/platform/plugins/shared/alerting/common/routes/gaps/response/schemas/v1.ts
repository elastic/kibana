/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { gapStatus } from '../../../../constants';

export const gapStatusSchema = schema.oneOf([
  schema.literal(gapStatus.UNFILLED),
  schema.literal(gapStatus.FILLED),
  schema.literal(gapStatus.PARTIALLY_FILLED),
]);

export const rangeSchema = schema.object({
  lte: schema.string(),
  gte: schema.string(),
});

export const rangeListSchema = schema.arrayOf(rangeSchema);

export const gapsResponseSchema = schema.object({
  '@timestamp': schema.string(),
  _id: schema.string(),
  status: gapStatusSchema,
  range: rangeSchema,
  in_progress_intervals: rangeListSchema,
  filled_intervals: rangeListSchema,
  unfilled_intervals: rangeListSchema,
  total_gap_duration_ms: schema.number(),
  filled_duration_ms: schema.number(),
  unfilled_duration_ms: schema.number(),
  in_progress_duration_ms: schema.number(),
});

export const errorResponseSchema = schema.object({
  error: schema.object({
    message: schema.string(),
    status: schema.maybe(schema.number()),
  }),
});
