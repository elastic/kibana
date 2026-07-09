/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { latencyAggregationTypeRt, type Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt, transactionDataSourceRt } from '../../default_api_types';

export interface ServiceTransactionGroupDetailedStat {
  transactionName: string;
  latency: Coordinate[];
  throughput: Coordinate[];
  errorRate: Coordinate[];
  impact: number;
}

export interface ServiceTransactionGroupDetailedStatisticsResponse {
  currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}

export const transactionGroupsDetailedStatisticsRoute =
  defineRoute<ServiceTransactionGroupDetailedStatisticsResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([
        environmentRt,
        kueryRt,
        rangeRt,
        t.intersection([
          offsetRt,
          transactionDataSourceRt,
          t.type({
            bucketSizeInSeconds: toNumberRt,
            useDurationSummary: toBooleanRt,
          }),
        ]),
        t.type({
          transactionNames: jsonRt.pipe(t.array(t.string)),
          transactionType: t.string,
          latencyAggregationType: latencyAggregationTypeRt,
        }),
      ]),
    }),
  });
