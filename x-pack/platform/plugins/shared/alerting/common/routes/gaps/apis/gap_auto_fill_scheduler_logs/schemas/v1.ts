/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const autoFillSchedulerLogsQuerySchema = schema.object({
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
  page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
  per_page: schema.maybe(schema.number({ defaultValue: 50, min: 1, max: 1000 })),
  sort: schema.maybe(
    schema.arrayOf(
      schema.object({
        field: schema.string(),
        direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
      })
    )
  ),
  filter: schema.maybe(schema.string()),
});

export const gapFillSchedulerLogEntrySchema = schema.object({
  timestamp: schema.string(),
  status: schema.oneOf([
    schema.literal('success'),
    schema.literal('error'),
    schema.literal('warning'),
    schema.literal('skipped'),
    schema.literal('unknown'),
  ]),
  message: schema.string(),
  duration_ms: schema.number(),
  summary: schema.object({
    total_rules: schema.number(),
    successful_rules: schema.number(),
    failed_rules: schema.number(),
    total_gaps_processed: schema.number(),
  }),
  config: schema.object({
    name: schema.string(),
    max_amount_of_gaps_to_process_per_run: schema.number(),
    max_amount_of_rules_to_process_per_run: schema.number(),
    amount_of_retries: schema.number(),
    rules_filter: schema.string(),
    gap_fill_range: schema.string(),
    schedule: schema.object({
      interval: schema.string(),
    }),
  }),
  results: schema.maybe(
    schema.arrayOf(
      schema.object({
        rule_id: schema.string(),
        processed_gaps: schema.number(),
        status: schema.oneOf([
          schema.literal('success'),
          schema.literal('error'),
          schema.literal('unknown'),
        ]),
        error: schema.maybe(schema.string()),
      })
    )
  ),
});

export const autoFillSchedulerLogsResponseSchema = schema.object({
  data: schema.arrayOf(gapFillSchedulerLogEntrySchema),
  total: schema.number(),
  page: schema.number(),
  per_page: schema.number(),
});
