/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapStatus } from '../../../../common/constants';

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

export const gapBaseSchema = schema.object({
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

export const findGapsParamsSchema = schema.object(
  {
    end: schema.string(),
    page: schema.number({ defaultValue: 1, min: 1 }),
    perPage: schema.number({ defaultValue: 10, min: 0 }),
    ruleId: schema.string(),
    start: schema.string(),
    sortField: schema.maybe(
      schema.oneOf([
        schema.literal('@timestamp'),
        schema.literal('kibana.alert.rule.gap.total_gap_duration_ms'),
        schema.literal('kibana.alert.rule.gap.status'),
      ])
    ),
    sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    statuses: schema.maybe(schema.arrayOf(gapStatusSchema)),
  },
  {
    validate({ start, end }) {
      const parsedStart = Date.parse(start);
      const parsedEnd = Date.parse(end);

      if (isNaN(parsedStart)) {
        return `[start]: query start must be valid date`;
      }

      if (isNaN(parsedEnd)) {
        return `[end]: query end must be valid date`;
      }

      if (parsedStart >= parsedEnd) {
        return `[start]: query start must be before end`;
      }
    },
  }
);

export const findGapsByIdParamsSchema = schema.object({
  gapIds: schema.arrayOf(schema.string()),
  ruleId: schema.string(),
  page: schema.number({ defaultValue: 1, min: 1 }),
  perPage: schema.number({ defaultValue: 10, min: 1 }),
});
