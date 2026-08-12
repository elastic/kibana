/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * WARNING: Do not modify existing versioned schemas. Add a new version instead.
 * See https://github.com/elastic/kibana/issues/155764.
 *
 * watermarks: map of saved-object type name → ISO-8601 date string (last successful sweep
 * start time for that type). On first run the key is absent; the reconciler treats absence as
 * the Unix epoch so the full detection query covers all docs.
 */
const stateSchemaV1 = schema.object({
  watermarks: schema.recordOf(schema.string({ maxLength: 100 }), schema.string({ maxLength: 30 })),
});

/**
 * V2 adds:
 * - consecutiveFailures: per-type count of consecutive inference failure sweeps, used to
 *   apply exponential backoff so a persistently broken inference endpoint does not spam logs
 *   or waste ES work every minute.
 * - lastFailureReason: per-type last failure reason string (to detect when the reason changes
 *   and emit a fresh WARN).
 * - rotationCursor: index into the sorted opted-in type list to start the next sweep from,
 *   so that no tail type is permanently starved when the list is long.
 */
const stateSchemaV2 = schema.object({
  watermarks: schema.recordOf(schema.string({ maxLength: 100 }), schema.string({ maxLength: 30 })),
  consecutiveFailures: schema.recordOf(
    schema.string({ maxLength: 100 }),
    schema.number({ min: 0, max: 1_000_000 })
  ),
  lastFailureReason: schema.recordOf(
    schema.string({ maxLength: 100 }),
    schema.string({ maxLength: 500 })
  ),
  rotationCursor: schema.number({ min: 0, max: 100_000 }),
});

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      watermarks:
        state.watermarks && typeof state.watermarks === 'object' && !Array.isArray(state.watermarks)
          ? (state.watermarks as Record<string, string>)
          : {},
    }),
    schema: stateSchemaV1,
  },
  2: {
    up: (state: Record<string, unknown>) => ({
      watermarks:
        state.watermarks && typeof state.watermarks === 'object' && !Array.isArray(state.watermarks)
          ? (state.watermarks as Record<string, string>)
          : {},
      consecutiveFailures:
        state.consecutiveFailures &&
        typeof state.consecutiveFailures === 'object' &&
        !Array.isArray(state.consecutiveFailures)
          ? (state.consecutiveFailures as Record<string, number>)
          : {},
      lastFailureReason:
        state.lastFailureReason &&
        typeof state.lastFailureReason === 'object' &&
        !Array.isArray(state.lastFailureReason)
          ? (state.lastFailureReason as Record<string, string>)
          : {},
      rotationCursor:
        typeof state.rotationCursor === 'number' && state.rotationCursor >= 0
          ? (state.rotationCursor as number)
          : 0,
    }),
    schema: stateSchemaV2,
  },
};

const latestSchema = stateSchemaByVersion[2].schema;
export type ReconcilerTaskState = TypeOf<typeof latestSchema>;

export const emptyState: ReconcilerTaskState = {
  watermarks: {},
  consecutiveFailures: {},
  lastFailureReason: {},
  rotationCursor: 0,
};
