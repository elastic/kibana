/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const stateSchemaByVersion = {
  1: {
    // Migrates the pre-versioned `{ previousStartedAt }` state. The value is a
    // wall-clock run start, not a data position; Phase 3 changes what is written
    // but the carried-over value is a safe starting point either way.
    // Prefer an existing eventWatermark: Task Manager re-runs every `up` from
    // `stateVersion` through latest, so v1.up must be idempotent on v1 state.
    up: (state: Record<string, unknown>) => ({
      eventWatermark:
        typeof state.eventWatermark === 'string'
          ? state.eventWatermark
          : typeof state.previousStartedAt === 'string'
          ? state.previousStartedAt
          : undefined,
    }),
    schema: schema.object({
      eventWatermark: schema.maybe(schema.string({ maxLength: 64 })),
    }),
  },
  2: {
    // Adds stuckTicks: counts consecutive ticks in which nextWatermark did not
    // advance. After STUCK_TICK_LIMIT ticks, the dispatcher force-records terminal
    // `unmatched` docs for the blocking episodes and advances.
    up: (state: Record<string, unknown>) => ({
      eventWatermark: typeof state.eventWatermark === 'string' ? state.eventWatermark : undefined,
      stuckTicks: typeof state.stuckTicks === 'number' ? state.stuckTicks : 0,
    }),
    schema: schema.object({
      eventWatermark: schema.maybe(schema.string({ maxLength: 64 })),
      stuckTicks: schema.number({ defaultValue: 0, min: 0 }),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[2].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
