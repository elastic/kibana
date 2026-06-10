/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import type { Coordinate } from '@kbn/apm-types';
import { latencyAggregationTypeRt } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

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

export const serviceInstancesDetailedStatisticsRoute =
  defineRoute<ServiceInstancesDetailedStatisticsResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([
        t.type({
          latencyAggregationType: latencyAggregationTypeRt,
          transactionType: t.string,
          serviceNodeIds: jsonRt.pipe(t.array(t.string)),
          numBuckets: toNumberRt,
        }),
        environmentRt,
        kueryRt,
        rangeRt,
        offsetRt,
      ]),
    }),
  });
