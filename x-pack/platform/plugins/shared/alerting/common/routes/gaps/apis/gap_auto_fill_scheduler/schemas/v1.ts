/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const gapAutoFillSchedulerBodySchema = schema.object({
  id: schema.maybe(schema.string()),
  name: schema.string({ defaultValue: '' }),
  enabled: schema.boolean({ defaultValue: true }),
  max_amount_of_gaps_to_process_per_run: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
  max_amount_of_rules_to_process_per_run: schema.number({ defaultValue: 100, min: 1, max: 10000 }),
  amount_of_retries: schema.number({ defaultValue: 3, min: 1 }),
  rules_filter: schema.maybe(schema.string()),
  gap_fill_range: schema.string(),
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
});

export const gapAutoFillSchedulerResponseSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  schedule: schema.object({
    interval: schema.string(),
  }),
  rules_filter: schema.string(),
  gap_fill_range: schema.string(),
  max_amount_of_gaps_to_process_per_run: schema.number(),
  max_amount_of_rules_to_process_per_run: schema.number(),
  amount_of_retries: schema.number(),
  created_by: schema.maybe(schema.string()),
  updated_by: schema.maybe(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
  last_run: schema.maybe(schema.nullable(schema.string())),
  scheduled_task_id: schema.string(),
});

export const updateGapAutoFillSchema = schema.object({
  schedule: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
  name: schema.maybe(schema.string()),
  max_amount_of_gaps_to_process_per_run: schema.maybe(schema.number()),
  max_amount_of_rules_to_process_per_run: schema.maybe(schema.number()),
  amount_of_retries: schema.maybe(schema.number()),
  rules_filter: schema.maybe(schema.string()),
  gap_fill_range: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
});
