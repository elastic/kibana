/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapStatusSchema } from '.';

const findGapsBaseParamsSchema = schema.object(
  {
    end: schema.maybe(schema.string()),
    perPage: schema.number({ defaultValue: 10, min: 0 }),
    start: schema.maybe(schema.string()),
    sortField: schema.maybe(
      schema.oneOf([
        schema.literal('@timestamp'),
        schema.literal('kibana.alert.rule.gap.total_gap_duration_ms'),
        schema.literal('kibana.alert.rule.gap.status'),
      ])
    ),
    sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    statuses: schema.maybe(schema.arrayOf(gapStatusSchema)),
    hasUnfilledIntervals: schema.maybe(schema.boolean()),
    hasInProgressIntervals: schema.maybe(schema.boolean()),
    hasFilledIntervals: schema.maybe(schema.boolean()),
  },
  {
    validate({ start, end }) {
      const parsedStart = start && Date.parse(start);
      const parsedEnd = end && Date.parse(end);

      if (parsedStart && isNaN(parsedStart)) {
        return `[start]: query start must be valid date`;
      }

      if (parsedEnd && isNaN(parsedEnd)) {
        return `[end]: query end must be valid date`;
      }

      if (parsedStart && parsedEnd && parsedStart >= parsedEnd) {
        return `[start]: query start must be before end`;
      }
    },
  }
);

export const findGapsParamsSchema = findGapsBaseParamsSchema.extends({
  ruleId: schema.string(),
  page: schema.number({ defaultValue: 1, min: 1 }),
});

export const findGapsByIdParamsSchema = schema.object({
  gapIds: schema.arrayOf(schema.string()),
  ruleId: schema.string(),
  page: schema.number({ defaultValue: 1, min: 1 }),
  perPage: schema.number({ defaultValue: 10, min: 1 }),
});

export const findGapsSearchAfterParamsSchema = findGapsBaseParamsSchema.extends({
  ruleIds: schema.arrayOf(schema.string()),
  pitId: schema.maybe(schema.string()),
  searchAfter: schema.maybe(
    schema.arrayOf(schema.oneOf([schema.string(), schema.number(), schema.boolean(), schema.any()]))
  ),
  updatedBefore: schema.maybe(schema.string()),
  failedAutoFillAttemptsLessThan: schema.maybe(schema.number({ min: 1 })),
});
