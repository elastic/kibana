/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const createGapFillAutoSchedulerSchema = schema.object({
  name: schema.maybe(schema.string()),
  maxAmountOfGapsToProcessPerRun: schema.maybe(schema.number()),
  maxAmountOfRulesToProcessPerRun: schema.maybe(schema.number()),
  amountOfRetries: schema.maybe(schema.number()),
  rulesFilter: schema.maybe(schema.string()),
  gapFillRange: schema.maybe(schema.string()),
  schedule: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
  request: schema.any(),
});
