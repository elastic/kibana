/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
import { latencyDistributionChartTypeSchema, environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import {
  MAX_ARRAY_ITEMS,
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
} from '../../constants';

export type LatencyOverallTransactionDistributionResponse = OverallLatencyDistributionResponse;

export const latencyOverallTransactionDistributionRoute =
  defineRoute<LatencyOverallTransactionDistributionResponse>()({
    endpoint: 'POST /internal/apm/latency/overall_distribution/transactions',
    params: lazySchema(() =>
      z.object({
        body: z
          .object({
            serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
            transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
            transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
            termFilters: z
              .array(
                z.object({
                  fieldName: z.string().max(MAX_FIELD_VALUE_LENGTH),
                  fieldValue: z.union([z.string().max(MAX_FIELD_VALUE_LENGTH), z.number()]),
                })
              )
              .max(MAX_ARRAY_ITEMS)
              .optional(),
            durationMin: z.coerce.number().optional(),
            durationMax: z.coerce.number().optional(),
            percentileThreshold: z.coerce.number().min(0).max(100),
            chartType: latencyDistributionChartTypeSchema,
          })
          .merge(environmentSchema)
          .merge(kuerySchema)
          .merge(rangeSchema),
      })
    ),
  });
