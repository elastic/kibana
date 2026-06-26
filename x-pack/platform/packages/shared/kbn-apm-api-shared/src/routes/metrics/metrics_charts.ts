/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { Coordinate, YUnit, ChartType } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface FetchAndTransformMetrics {
  title: string;
  key: string;
  yUnit: YUnit;
  series: Array<{
    title: string;
    key: string;
    type: ChartType;
    overallValue: number;
    data: Coordinate[];
  }>;
  description?: string;
}

export type GenericMetricsChart = FetchAndTransformMetrics;

export interface MetricsChartsResponse {
  charts: FetchAndTransformMetrics[];
}

export const metricsChartsRoute = defineRoute<MetricsChartsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ agentName: t.string }),
      t.partial({ serviceNodeName: t.string }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
});
