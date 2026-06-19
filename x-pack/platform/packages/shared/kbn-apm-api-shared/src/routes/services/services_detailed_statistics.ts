/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import type { Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kueryRt,
  rangeRt,
  offsetRt,
  probabilityRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';

export interface ServiceTransactionDetailedStat {
  serviceName: string;
  latency: Coordinate[];
  transactionErrorRate?: Coordinate[];
  throughput?: Coordinate[];
}

export interface ServiceTransactionDetailedStatPeriodsResponse {
  currentPeriod: Record<string, ServiceTransactionDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionDetailedStat>;
}

export const servicesDetailedStatisticsRoute =
  defineRoute<ServiceTransactionDetailedStatPeriodsResponse>()({
    endpoint: 'POST /internal/apm/services/detailed_statistics',
    params: t.type({
      query: t.intersection([
        environmentRt,
        kueryRt,
        rangeRt,
        t.intersection([offsetRt, probabilityRt, serviceTransactionDataSourceRt]),
        t.type({
          bucketSizeInSeconds: toNumberRt,
        }),
      ]),
      body: t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
    }),
  });
