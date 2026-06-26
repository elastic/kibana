/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export type ServiceAlertsResponse = Array<{
  serviceName: string;
  alertsCount: number;
}>;

export type ServiceAlertsCountRouteResponse = ServiceAlertsResponse[number];

export const serviceAlertsCountRoute = defineRoute<ServiceAlertsCountRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([rangeRt, environmentRt]),
  }),
});
