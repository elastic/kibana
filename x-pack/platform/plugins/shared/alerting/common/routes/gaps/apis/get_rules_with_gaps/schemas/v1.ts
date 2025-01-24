/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const getRuleIdsWithGapQuerySchema = schema.object(
  {
    end: schema.string(),
    start: schema.string(),
    statuses: schema.maybe(schema.arrayOf(schema.string())),
  },
  {
    validate({ start, end }) {
      if (start) {
        const parsedStart = Date.parse(start);
        if (isNaN(parsedStart)) {
          return `[start]: query start must be valid date`;
        }
      }
      if (end) {
        const parsedEnd = Date.parse(end);
        if (isNaN(parsedEnd)) {
          return `[end]: query end must be valid date`;
        }
      }
    },
  }
);

export const getRuleIdsWithGapResponseSchema = schema.object({
  total: schema.number(),
  rule_ids: schema.arrayOf(schema.string()),
});
