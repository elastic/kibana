/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { gapAutoFillSchedulerLimits } from '../../../../common/constants';

const { maxBackfills, numRetries } = gapAutoFillSchedulerLimits;

export const rawGapAutoFillSchedulerSchemaV1 = schema.object(
  {
    name: schema.string(),
    enabled: schema.boolean(),
    schedule: schema.object({
      interval: schema.string(),
    }),
    gapFillRange: schema.string(),
    maxBackfills: schema.number(maxBackfills),
    numRetries: schema.number(numRetries),
    scope: schema.arrayOf(schema.string()),
    ruleTypes: schema.arrayOf(
      schema.object({
        type: schema.string(),
        consumer: schema.string(),
      }),
      {
        minSize: 1,
      }
    ),
    ruleTypeConsumerPairs: schema.arrayOf(schema.string()),
    createdBy: schema.nullable(schema.string()),
    updatedBy: schema.nullable(schema.string()),
    createdAt: schema.string(),
    updatedAt: schema.string(),
  },
  { unknowns: 'ignore' }
);

export type RawGapAutoFillSchedulerAttributesV1 = TypeOf<typeof rawGapAutoFillSchedulerSchemaV1>;
