/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type ServerlessFunctionsOverviewResponse = Array<{
  serverlessId: string;
  serverlessFunctionName: string;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  coldStartCount: number | null;
  avgMemoryUsed: number | undefined;
  memorySize: number | null;
}>;

export interface ServerlessFunctionsOverviewRouteResponse {
  serverlessFunctionsOverview: ServerlessFunctionsOverviewResponse;
}

export const serverlessFunctionsOverviewRoute =
  defineRoute<ServerlessFunctionsOverviewRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([environmentRt, kueryRt, rangeRt]),
    }),
  });
