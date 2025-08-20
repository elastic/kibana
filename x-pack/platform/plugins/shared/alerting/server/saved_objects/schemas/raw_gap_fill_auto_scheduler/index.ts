/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawGapFillAutoSchedulerSchemaV1 = schema.object(
  {
    name: schema.string(),
    enabled: schema.boolean({ defaultValue: true }),
    schedule: schema.object({
      interval: schema.string(),
    }),
    rulesFilter: schema.maybe(schema.string()),
    gapFillRange: schema.string({ defaultValue: 'now-7d' }),
    maxAmountOfGapsToProcessPerRun: schema.number({ defaultValue: 10000 }),
    maxAmountOfRulesToProcessPerRun: schema.number({ defaultValue: 100 }),
    amountOfRetries: schema.number({ defaultValue: 3 }),

    scheduledTaskId: schema.maybe(schema.string()),

    createdBy: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    createdAt: schema.string(),
    updatedAt: schema.string(),

    lastRun: schema.maybe(
      schema.object({
        status: schema.oneOf([
          schema.literal('success'),
          schema.literal('warning'),
          schema.literal('error'),
        ]),
        message: schema.maybe(schema.string()),
        metrics: schema.maybe(
          schema.object({
            totalRules: schema.maybe(schema.number()),
            successfulRules: schema.maybe(schema.number()),
            failedRules: schema.maybe(schema.number()),
            totalGapsProcessed: schema.maybe(schema.number()),
          })
        ),
      })
    ),
    nextRun: schema.maybe(schema.string()),
    running: schema.maybe(schema.boolean()),
  },
  { unknowns: 'ignore' }
);
