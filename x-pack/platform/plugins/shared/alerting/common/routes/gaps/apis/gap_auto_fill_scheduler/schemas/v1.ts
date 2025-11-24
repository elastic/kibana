/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';
import { gapAutoFillSchedulerLimits } from '../../../../../constants';
import { parseDuration } from '../../../../../parse_duration';

const { maxBackfills, numRetries, minScheduleIntervalInMs } = gapAutoFillSchedulerLimits;

export const gapAutoFillSchedulerBodySchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    name: schema.string({ defaultValue: '' }),
    enabled: schema.boolean({ defaultValue: true }),
    max_backfills: schema.number(maxBackfills),
    num_retries: schema.number(numRetries),
    gap_fill_range: schema.string({ defaultValue: 'now-90d' }),
    schedule: schema.object({
      interval: schema.string(),
    }),
    scope: schema.arrayOf(schema.string()),
    rule_types: schema.arrayOf(
      schema.object({
        type: schema.string(),
        consumer: schema.string(),
      })
    ),
  },
  {
    validate({ gap_fill_range: gapFillRange, schedule }) {
      const parsed = dateMath.parse(gapFillRange);
      if (!parsed || !parsed.isValid()) {
        return 'gap_fill_range is invalid';
      }

      try {
        const intervalMs = parseDuration(schedule.interval);
        if (intervalMs < minScheduleIntervalInMs) {
          return 'schedule.interval must be at least 1 minute';
        }
      } catch (error) {
        return `schedule.interval is invalid: ${(error as Error).message}`;
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
  rule_types: schema.arrayOf(
    schema.object({
      type: schema.string(),
      consumer: schema.string(),
    })
  ),
  gap_fill_range: schema.string(),
  max_backfills: schema.number(),
  num_retries: schema.number(),
  scope: schema.arrayOf(schema.string()),
  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
});
