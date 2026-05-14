/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { compositeSloMemberSummarySchema, compositeStatusSchema } from './composite_slo';

/**
 * Flat summary fields persisted on composite summary index documents (see task `buildSummaryDoc`).
 * Other top-level keys (`spaceId`, `summaryUpdatedAt`, `compositeSlo`, …) are ignored by decode.
 */
const storedCompositeSloSummarySchema = z.object({
  sliValue: z.number(),
  status: compositeStatusSchema,
  errorBudgetInitial: z.number(),
  errorBudgetConsumed: z.number(),
  errorBudgetRemaining: z.number(),
  errorBudgetIsEstimated: z.boolean(),
  fiveMinuteBurnRate: z.number(),
  oneHourBurnRate: z.number(),
  oneDayBurnRate: z.number(),
  members: z.array(compositeSloMemberSummarySchema).optional(),
});

export { storedCompositeSloSummarySchema };
