/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { aggregatedGapStatus, gapStatus } from '../../../../../constants';

export const getRuleIdsWithGapBodySchema = schema.object(
  {
    end: schema.string(),
    start: schema.string(),
    statuses: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal(gapStatus.UNFILLED),
          schema.literal(gapStatus.PARTIALLY_FILLED),
          schema.literal(gapStatus.FILLED),
        ])
      )
    ),
    aggregated_statuses: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal(aggregatedGapStatus.UNFILLED),
          schema.literal(aggregatedGapStatus.IN_PROGRESS),
          schema.literal(aggregatedGapStatus.FILLED),
        ])
      )
    ),
    has_unfilled_intervals: schema.maybe(schema.boolean()),
    has_in_progress_intervals: schema.maybe(schema.boolean()),
    has_filled_intervals: schema.maybe(schema.boolean()),
  },
  {
    validate({ start, end }) {
      const parsedStart = Date.parse(start);
      if (isNaN(parsedStart)) {
        return `[start]: query start must be valid date`;
      }

      const parsedEnd = Date.parse(end);
      if (isNaN(parsedEnd)) {
        return `[end]: query end must be valid date`;
      }

      if (parsedStart >= parsedEnd) {
        return `[start]: query start must be before end`;
      }
    },
  }
);

export const getRuleIdsWithGapResponseSchema = schema.object({
  total: schema.number(),
  rule_ids: schema.arrayOf(schema.string()),
  latest_gap_timestamp: schema.maybe(schema.number()),
});
