/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { FACT_MEMORY_TYPE } from './fact_type';

const stateSchemaV1 = schema.object({
  /** Start time of the last successful run. The next run reads memories written after it. */
  lastDreamAt: schema.maybe(schema.string()),
  lastRunAt: schema.maybe(schema.string()),
  lastRunStatus: schema.maybe(schema.oneOf([schema.literal('success'), schema.literal('failed')])),
  lastError: schema.maybe(schema.string()),
});

/** Adds the counts from the last run; they are unset after a failed run. */
const stateSchemaV2 = stateSchemaV1.extends({
  lastRunMemoriesRead: schema.maybe(schema.number()),
  lastRunApplied: schema.maybe(schema.number()),
  lastRunSkipped: schema.maybe(schema.number()),
});

const typeRunSchema = schema.object({
  memoriesRead: schema.number(),
  applied: schema.number(),
  skipped: schema.number(),
  batches: schema.number(),
  error: schema.maybe(schema.string()),
});

/**
 * Reads the window per long-term memory type, so one type failing does not make the others
 * re-read it. `lastDreamAt` becomes the start of the last run that made progress.
 */
const stateSchemaV3 = stateSchemaV2.extends({
  lastRunStatus: schema.maybe(
    schema.oneOf([schema.literal('success'), schema.literal('partial'), schema.literal('failed')])
  ),
  /** Per long-term memory type: the short-term memories up to this time are done. */
  cursors: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  lastRunTypes: schema.maybe(schema.recordOf(schema.string(), typeRunSchema)),
  /** The last run stopped with memories left, and the next run starts soon. */
  catchingUp: schema.maybe(schema.boolean()),
  /** About how many short-term memories are left while catching up. */
  pendingMemories: schema.maybe(schema.number()),
});

const upToV3 = (state: Record<string, unknown>) =>
  typeof state.lastDreamAt === 'string' && state.cursors === undefined
    ? { ...state, cursors: { [FACT_MEMORY_TYPE.type]: state.lastDreamAt } }
    : state;

export const stateSchemaByVersion = {
  1: { schema: stateSchemaV1, up: (state: Record<string, unknown>) => state },
  2: { schema: stateSchemaV2, up: (state: Record<string, unknown>) => state },
  3: { schema: stateSchemaV3, up: upToV3 },
};

export type MemoryDreamingTaskState = TypeOf<typeof stateSchemaV3>;
export type MemoryDreamingTypeRun = TypeOf<typeof typeRunSchema>;
