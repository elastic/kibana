/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { MAX_TASK_TYPE_BUCKETS } from './constants';

/**
 * WARNING: Do not modify the existing versioned schema(s) below; add a new version instead.
 * Required for zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * When adding fields, introduce `stateSchemaV2` (etc.), extend `stateSchemaByVersion`, and point
 * `latestTaskStateSchema` at the newest version.
 */

const nameValuePairSchema = schema.object({ name: schema.string(), value: schema.number() });

const percentilesSchema = schema.object({
  p50: schema.nullable(schema.number()),
  p75: schema.nullable(schema.number()),
  p95: schema.nullable(schema.number()),
  p99: schema.nullable(schema.number()),
});

const stateSchemaV1 = schema.object({
  has_errors: schema.boolean(),
  error_messages: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  runs: schema.number(),

  total_task_runs_1d: schema.maybe(schema.number()),
  task_runs_by_type_1d: schema.maybe(
    schema.arrayOf(nameValuePairSchema, { maxSize: MAX_TASK_TYPE_BUCKETS })
  ),
  task_runs_other_1d: schema.maybe(schema.number()),
  schedule_delay_1d_ms: schema.maybe(percentilesSchema),
});

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      has_errors: state.has_errors ?? false,
      error_messages: state.error_messages ?? undefined,
      runs: state.runs ?? 0,
      total_task_runs_1d: state.total_task_runs_1d ?? undefined,
      task_runs_by_type_1d: state.task_runs_by_type_1d ?? undefined,
      task_runs_other_1d: state.task_runs_other_1d ?? undefined,
      schedule_delay_1d_ms: state.schedule_delay_1d_ms ?? undefined,
    }),
    schema: stateSchemaV1,
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  has_errors: false,
  error_messages: undefined,
  runs: 0,
};
