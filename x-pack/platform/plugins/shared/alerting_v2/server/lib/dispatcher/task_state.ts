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
    up: (state: Record<string, unknown>) => ({
      eventWatermark:
        typeof state.previousStartedAt === 'string' ? state.previousStartedAt : undefined,
    }),
    schema: schema.object({
      eventWatermark: schema.maybe(schema.string({ maxLength: 64 })),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
