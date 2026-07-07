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

export type ServiceNodesResponse = Array<{
  name: string;
  cpu: number | null;
  heapMemory: number | null;
  hostName: string | null | undefined;
  nonHeapMemory: number | null;
  threadCount: number | null;
}>;

export interface ServiceMetricsNodesRouteResponse {
  serviceNodes: ServiceNodesResponse;
}

export const serviceMetricsNodesRoute = defineRoute<ServiceMetricsNodesRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/nodes',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
});
