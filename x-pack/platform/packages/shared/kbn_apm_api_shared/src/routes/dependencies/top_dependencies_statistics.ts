/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

interface Statistics {
  latency: Array<{ x: number; y: number }>;
  errorRate: Array<{ x: number; y: number }>;
  throughput: Array<{ x: number; y: number | null }>;
}

export interface DependenciesTimeseriesStatisticsResponse {
  currentTimeseries: Record<string, Statistics>;
  comparisonTimeseries: Record<string, Statistics> | null;
}

export const topDependenciesStatisticsRoute =
  defineRoute<DependenciesTimeseriesStatisticsResponse>()({
    endpoint: 'POST /internal/apm/dependencies/top_dependencies/statistics',
    params: t.type({
      query: t.intersection([
        t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
        t.type({ numBuckets: toNumberRt }),
      ]),
      body: t.type({ dependencyNames: jsonRt.pipe(t.array(t.string)) }),
    }),
  });
