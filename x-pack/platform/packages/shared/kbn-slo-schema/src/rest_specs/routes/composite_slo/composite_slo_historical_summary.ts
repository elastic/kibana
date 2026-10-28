/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import {
  compositeSloIdSchema,
  compositeErrorBudgetSchema,
  compositeStatusSchema,
} from '../../../schema/composite_slo';

const compositeHistoricalSummarySchema = lazySchema(() =>
  z.object({
    date: z.string(),
    status: compositeStatusSchema,
    sliValue: z.number(),
    errorBudget: compositeErrorBudgetSchema,
  })
);

const fetchCompositeHistoricalSummaryParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z.array(compositeSloIdSchema),
    }),
  })
);

const fetchCompositeHistoricalSummaryResponseSchema = lazySchema(() =>
  z.array(
    z.object({
      compositeId: compositeSloIdSchema,
      data: z.array(compositeHistoricalSummarySchema),
    })
  )
);

type FetchCompositeHistoricalSummaryParams = z.infer<
  typeof fetchCompositeHistoricalSummaryParamsSchema.shape.body
>;
type FetchCompositeHistoricalSummaryResponse = z.infer<
  typeof fetchCompositeHistoricalSummaryResponseSchema
>;

export {
  fetchCompositeHistoricalSummaryParamsSchema,
  fetchCompositeHistoricalSummaryResponseSchema,
};
export type { FetchCompositeHistoricalSummaryParams, FetchCompositeHistoricalSummaryResponse };
