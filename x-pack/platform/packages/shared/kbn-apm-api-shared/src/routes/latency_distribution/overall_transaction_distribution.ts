/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
import { latencyDistributionChartTypeSchema, environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export type LatencyOverallTransactionDistributionResponse = OverallLatencyDistributionResponse;

export const latencyOverallTransactionDistributionRoute =
  defineRoute<LatencyOverallTransactionDistributionResponse>()({
    endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
    params: z.object({
      body: z
        .object({
          serviceName: z.string().optional(),
          transactionName: z.string().optional(),
          transactionType: z.string().optional(),
          termFilters: z
            .array(
              z.object({
                fieldName: z.string(),
                fieldValue: z.union([z.string(), z.number()]),
              })
            )
            .optional(),
          durationMin: z.coerce.number().optional(),
          durationMax: z.coerce.number().optional(),
          percentileThreshold: z.coerce.number(),
          chartType: latencyDistributionChartTypeSchema,
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    }),
  });
