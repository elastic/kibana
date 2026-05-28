/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { instancesSortFieldRt, latencyAggregationTypeRt } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export type ServiceInstanceMainStatisticsResponse = Array<{
  serviceNodeName: string;
  errorRate?: number;
  latency?: number;
  throughput?: number;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
}>;

export interface ServiceInstancesMainStatisticsRouteResponse {
  currentPeriod: ServiceInstanceMainStatisticsResponse;
  previousPeriod: ServiceInstanceMainStatisticsResponse;
}

export const serviceInstancesMainStatisticsRoute =
  defineRoute<ServiceInstancesMainStatisticsRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([
        t.type({
          latencyAggregationType: latencyAggregationTypeRt,
          transactionType: t.string,
          sortField: instancesSortFieldRt,
          sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        }),
        offsetRt,
        environmentRt,
        kueryRt,
        rangeRt,
      ]),
    }),
  });
