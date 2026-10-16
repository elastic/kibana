/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
import { latencyAggregationTypeSchema } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';
import {
  MAX_ARRAY_ITEMS,
  MAX_FIELD_VALUE_LENGTH,
  MAX_JSON_ARRAY_PARAM_LENGTH,
  MAX_NUM_BUCKETS,
} from '../../constants';

export interface ServiceInstancesDetailedStat {
  serviceNodeName: string;
  errorRate?: Coordinate[];
  latency?: Coordinate[];
  throughput?: Coordinate[];
  cpuUsage?: Coordinate[];
  memoryUsage?: Coordinate[];
}

export interface ServiceInstancesDetailedStatisticsResponse {
  currentPeriod: Record<string, ServiceInstancesDetailedStat>;
  previousPeriod: Record<string, ServiceInstancesDetailedStat>;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value as an array of strings.
const serviceNodeIdsSchema = z
  .string()
  .max(MAX_JSON_ARRAY_PARAM_LENGTH)
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string().max(MAX_FIELD_VALUE_LENGTH)).max(MAX_ARRAY_ITEMS));

export const serviceInstancesDetailedStatisticsRoute =
  defineRoute<ServiceInstancesDetailedStatisticsResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
    params: lazySchema(() =>
      z.object({
        path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
        query: z
          .object({
            latencyAggregationType: latencyAggregationTypeSchema,
            transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH),
            serviceNodeIds: serviceNodeIdsSchema,
            numBuckets: z.coerce.number().int().min(1).max(MAX_NUM_BUCKETS),
          })
          .merge(environmentSchema)
          .merge(kuerySchema)
          .merge(rangeSchema)
          .merge(offsetSchema),
      })
    ),
  });
