/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt, offsetRt } from '../../default_api_types';

export interface DependencyOperation {
  spanName: string;
  latency: number | null;
  throughput: number;
  failureRate: number | null;
  impact: number;
  timeseries: Record<
    'latency' | 'throughput' | 'failureRate',
    Array<{ x: number; y: number | null }>
  >;
}

export interface DependencyOperationsResponse {
  operations: DependencyOperation[];
}

export const dependencyOperationsRoute = defineRoute<DependencyOperationsResponse>()({
  endpoint: 'GET /internal/apm/dependencies/operations',
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      offsetRt,
      t.type({
        dependencyName: t.string,
        searchServiceDestinationMetrics: toBooleanRt,
      }),
    ]),
  }),
});
