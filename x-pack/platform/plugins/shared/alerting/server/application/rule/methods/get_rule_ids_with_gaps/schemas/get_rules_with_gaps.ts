/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getRuleIdsWithGapsParamsSchema = schema.object({
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
  statuses: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('unfilled'),
        schema.literal('in_progress'),
        schema.literal('filled'),
      ])
    )
  ),
  hasUnfilledIntervals: schema.maybe(schema.boolean()),
  hasInProgressIntervals: schema.maybe(schema.boolean()),
  hasFilledIntervals: schema.maybe(schema.boolean()),
});

export const getRuleIdsWithGapsResponseSchema = schema.object({
  total: schema.number(),
  ruleIds: schema.arrayOf(schema.string()),
  latestGapTimestamp: schema.maybe(schema.number()),
});
