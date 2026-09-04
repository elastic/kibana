/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import {
  budgetingMethodSchema,
  objectiveSchema,
  sloIdSchema,
} from '../../schema/zod/slo';
import { timeWindowSchema } from '../../schema/zod/time_window';
import {
  allOrAnyString,
  allOrAnyStringOrArray,
  dateRangeSchema,
  dateType,
  errorBudgetSchema,
  statusSchema,
} from '../../schema/zod/common';

const fetchHistoricalSummaryParamsSchema = z.object({
  body: z.object({
    list: z.array(
      z.object({
        sloId: sloIdSchema,
        instanceId: z.string(),
        timeWindow: timeWindowSchema,
        budgetingMethod: budgetingMethodSchema,
        objective: objectiveSchema,
        groupBy: allOrAnyStringOrArray,
        revision: z.number(),
        remoteName: z.string().optional(),
        range: dateRangeSchema.optional(),
      })
    ),
  }),
});

const historicalSummarySchema = z.object({
  date: dateType,
  status: statusSchema,
  sliValue: z.number(),
  errorBudget: errorBudgetSchema,
});

const fetchHistoricalSummaryResponseSchema = z.array(
  z.object({
    sloId: sloIdSchema,
    instanceId: allOrAnyString,
    data: z.array(historicalSummarySchema),
  })
);

type FetchHistoricalSummaryParams = z.output<typeof fetchHistoricalSummaryParamsSchema.shape.body>;
type FetchHistoricalSummaryResponse = z.input<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = z.input<typeof historicalSummarySchema>;

export {
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  historicalSummarySchema,
};
export type {
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
};
