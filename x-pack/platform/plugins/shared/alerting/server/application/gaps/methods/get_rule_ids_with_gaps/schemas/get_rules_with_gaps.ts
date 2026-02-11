/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapFillStatus, gapStatus } from '../../../../../../common';

export const getRuleIdsWithGapsParamsSchema = schema.object({
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
  // Filters the underlying gap documents before aggregation. Matches the raw
  // per-gap statuses.
  statuses: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(gapStatus.UNFILLED),
        schema.literal(gapStatus.PARTIALLY_FILLED),
        schema.literal(gapStatus.FILLED),
      ])
    )
  ),
  // Derived, per-rule status filter computed from the aggregated gap duration
  // sums with precedence: unfilled > in_progress > filled.
  highestPriorityGapFillStatuses: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(gapFillStatus.UNFILLED),
        schema.literal(gapFillStatus.IN_PROGRESS),
        schema.literal(gapFillStatus.FILLED),
      ])
    )
  ),
  hasUnfilledIntervals: schema.maybe(schema.boolean()),
  hasInProgressIntervals: schema.maybe(schema.boolean()),
  hasFilledIntervals: schema.maybe(schema.boolean()),
  ruleTypes: schema.maybe(
    schema.arrayOf(
      schema.object({
        type: schema.string(),
        consumer: schema.string(),
      })
    )
  ),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  maxRulesToFetch: schema.maybe(schema.number()),
  ruleIds: schema.maybe(schema.arrayOf(schema.string())),
});

export const getRuleIdsWithGapsResponseSchema = schema.object({
  total: schema.number(),
  ruleIds: schema.arrayOf(schema.string()),
  latestGapTimestamp: schema.maybe(schema.number()),
});
