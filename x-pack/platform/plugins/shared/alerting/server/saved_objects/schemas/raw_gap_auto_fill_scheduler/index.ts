/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

export const rawGapAutoFillSchedulerSchemaV1 = schema.object(
  {
    name: schema.string(),
    enabled: schema.boolean(),
    schedule: schema.object({
      interval: schema.string(),
    }),
    gapFillRange: schema.string(),
    maxBackfills: schema.number(),
    numRetries: schema.number(),
    ruleTypes: schema.arrayOf(
      schema.object({
        type: schema.string(),
        consumer: schema.string(),
      })
    ),
    ruleTypeConsumerPairs: schema.arrayOf(schema.string()),
    createdBy: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    createdAt: schema.string(),
    updatedAt: schema.string(),
  },
  { unknowns: 'ignore' }
);

export type RawGapAutoFillSchedulerAttributesV1 = TypeOf<typeof rawGapAutoFillSchedulerSchemaV1>;
