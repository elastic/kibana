/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  JOB_ID_PATTERN,
  MAX_EVERY_SECONDS,
  MAX_RUN_AT_AHEAD_MS,
  MIN_EVERY_SECONDS,
  TASK_ID_PATTERN,
} from '../../common';

export const jobIdParamsSchema = schema.object({
  jobId: schema.string({
    maxLength: 128,
    validate: (value) => (JOB_ID_PATTERN.test(value) ? undefined : 'must match job_{id}'),
  }),
});

export const taskIdParamsSchema = schema.object({
  taskId: schema.string({
    maxLength: 160,
    validate: (value) =>
      TASK_ID_PATTERN.test(value) ? undefined : 'must match job_{id}:{firedAtMs}',
  }),
});

export const limitQuerySchema = schema.object({
  limit: schema.maybe(schema.number({ min: 1, max: 100 })),
});

export const createJobBodySchema = schema.object({
  query: schema.string({ minLength: 1, maxLength: 10_000 }),
  everySeconds: schema.maybe(
    schema.number({
      min: MIN_EVERY_SECONDS,
      max: MAX_EVERY_SECONDS,
      validate: (value) => (Number.isInteger(value) ? undefined : 'must be a whole number'),
    })
  ),
  runAt: schema.maybe(
    schema.string({
      maxLength: 64,
      validate: (value) => {
        const runAtMs = Date.parse(value);
        if (Number.isNaN(runAtMs)) {
          return 'must be an ISO 8601 date-time';
        }
        if (runAtMs > Date.now() + MAX_RUN_AT_AHEAD_MS) {
          return 'must be at most 30 days ahead';
        }
      },
    })
  ),
  idempotencyKey: schema.maybe(schema.string({ minLength: 1, maxLength: 128 })),
});
