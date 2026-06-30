/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt } from '@kbn/apm-types';
import type { FetchAndTransformMetrics } from './metrics_charts';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, transactionDataSourceRt } from '../../default_api_types';

export interface ServerlessMetricsChartsResponse {
  charts: FetchAndTransformMetrics[];
}

export const serverlessMetricsChartsRoute = defineRoute<ServerlessMetricsChartsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/charts',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.partial({ serverlessId: t.string }),
      t.intersection([transactionDataSourceRt, t.type({ bucketSizeInSeconds: toNumberRt })]),
    ]),
  }),
});
