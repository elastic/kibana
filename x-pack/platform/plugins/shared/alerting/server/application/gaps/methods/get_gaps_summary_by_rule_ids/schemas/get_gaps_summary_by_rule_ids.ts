/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getGapsSummaryByRuleIdsParamsSchema = schema.object({
  start: schema.string(),
  end: schema.string(),
  ruleIds: schema.arrayOf(schema.string()),
});

export const getGapsSummaryByRuleIdsResponseSchema = schema.object({
  data: schema.arrayOf(
    schema.object({
      ruleId: schema.string(),
      totalUnfilledDurationMs: schema.number(),
      totalInProgressDurationMs: schema.number(),
      totalFilledDurationMs: schema.number(),
    })
  ),
});
