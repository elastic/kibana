/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const createGapFillAutoSchedulerSchema = schema.object({
  id: schema.maybe(schema.string()),
  name: schema.string(),
  enabled: schema.boolean(),
  maxAmountOfGapsToProcessPerRun: schema.number(),
  maxAmountOfRulesToProcessPerRun: schema.number(),
  amountOfRetries: schema.number(),
  rulesFilter: schema.maybe(schema.string()),
  gapFillRange: schema.string(),
  schedule: schema.object({
    interval: schema.string(),
  }),
  request: schema.any(),
  scope: schema.maybe(schema.arrayOf(schema.string())),
  ruleTypes: schema.arrayOf(
    schema.object({
      type: schema.string(),
      consumer: schema.string(),
    })
  ),
});
