/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapAutoFillSchedulerLimits } from '../../../../../../common/constants';

const { maxBackfills, numRetries } = gapAutoFillSchedulerLimits;

export const updateGapAutoFillSchedulerSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  gapFillRange: schema.string(),
  maxBackfills: schema.number(maxBackfills),
  numRetries: schema.number(numRetries),
  schedule: schema.object({
    interval: schema.string(),
  }),
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
  request: schema.any(),
});
