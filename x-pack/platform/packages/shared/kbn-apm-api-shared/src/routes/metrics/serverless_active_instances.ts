/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface ActiveInstanceTimeseries {
  serverlessDuration: Coordinate[];
  billedDuration: Coordinate[];
}

export interface ActiveInstanceOverview {
  activeInstanceName: string;
  serverlessId: string;
  serverlessFunctionName: string;
  timeseries: ActiveInstanceTimeseries;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  avgMemoryUsed?: number | null;
  memorySize: number | null;
}

export interface ServerlessActiveInstancesResponse {
  activeInstances: ActiveInstanceOverview[];
  timeseries: Coordinate[];
}

export const serverlessActiveInstancesRoute = defineRoute<ServerlessActiveInstancesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, t.partial({ serverlessId: t.string })]),
  }),
});
