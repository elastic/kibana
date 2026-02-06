/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapAutoFillSchedulerLimits } from '../../../../../../common/constants';

const { maxBackfills, numRetries } = gapAutoFillSchedulerLimits;

export const gapAutoFillSchedulerSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  schedule: schema.object({
    interval: schema.string(),
  }),
  ruleTypes: schema.arrayOf(
    schema.object({
      type: schema.string(),
      consumer: schema.string(),
    })
  ),
  scope: schema.arrayOf(schema.string()),
  gapFillRange: schema.string(),
  maxBackfills: schema.number(maxBackfills),
  numRetries: schema.number(numRetries),
  createdBy: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
