/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getGapsSummaryForAllRulesParamsSchema = schema.object({
  start: schema.string(),
  end: schema.string(),
});

export const getGapsSummaryForAllRulesResponseSchema = schema.object({
  totalUnfilledDurationMs: schema.number(),
  totalInProgressDurationMs: schema.number(),
  totalFilledDurationMs: schema.number(),
});
