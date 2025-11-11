/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';

export const gapAutoFillSchedulerBodySchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    name: schema.string({ defaultValue: '' }),
    enabled: schema.boolean({ defaultValue: true }),
    max_backfills: schema.number({ defaultValue: 1000, min: 1, max: 5000 }),
    num_retries: schema.number({ defaultValue: 3, min: 1 }),
    gap_fill_range: schema.string({ defaultValue: 'now-90d' }),
    schedule: schema.object({
      interval: schema.string(),
    }),
    scope: schema.maybe(schema.arrayOf(schema.string())),
    rule_types: schema.arrayOf(
      schema.object({
        type: schema.string(),
        consumer: schema.string(),
      })
    ),
  },
  {
    validate({ gap_fill_range: gapFillRange }) {
      const parsed = dateMath.parse(gapFillRange);
      if (!parsed || !parsed.isValid()) {
        return 'gap_fill_range is invalid';
      }
    },
  }
);

export const gapAutoFillSchedulerResponseSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  schedule: schema.object({
    interval: schema.string(),
  }),
  gap_fill_range: schema.string(),
  max_backfills: schema.number(),
  num_retries: schema.number(),
  created_by: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
});
