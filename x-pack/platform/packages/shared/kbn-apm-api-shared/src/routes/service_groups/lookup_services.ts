/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { AgentName } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export type LookupServicesResponse = Array<{
  serviceName: string;
  environments: string[];
  agentName: AgentName;
}>;

export interface LookupServicesRouteResponse {
  items: LookupServicesResponse;
}

export const serviceGroupServicesRoute = defineRoute<LookupServicesRouteResponse>()({
  endpoint: 'GET /internal/apm/service-group/services',
  params: t.type({
    query: t.intersection([rangeRt, t.partial(kueryRt.props)]),
  }),
});
