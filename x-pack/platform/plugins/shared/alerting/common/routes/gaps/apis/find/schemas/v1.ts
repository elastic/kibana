/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { gapsResponseSchemaV1 } from '../../../response';

export const findGapsBodySchema = schema.object(
  {
    end: schema.string(),
    page: schema.number({ defaultValue: 1, min: 1 }),
    per_page: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
    rule_id: schema.string(),
    start: schema.string(),
    sort_field: schema.maybe(
      schema.oneOf([
        schema.literal('@timestamp'),
        schema.literal('kibana.alert.rule.gap.status'),
        schema.literal('kibana.alert.rule.gap.total_gap_duration_ms'),
      ])
    ),
    sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    statuses: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('partially_filled'),
          schema.literal('unfilled'),
          schema.literal('filled'),
        ])
      )
    ),
  },
  {
    validate({ start, end }) {
      const parsedStart = Date.parse(start);
      const parsedEnd = Date.parse(end);
      if (start) {
        if (isNaN(parsedStart)) {
          return `[start]: query start must be valid date`;
        }
      }
      if (end) {
        if (isNaN(parsedEnd)) {
          return `[end]: query end must be valid date`;
        }
      }
      if (parsedStart >= parsedEnd) {
        return `[start]: query start must be before end`;
      }
    },
  }
);

export const findGapsResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(gapsResponseSchemaV1),
});
