/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import type { SloStatus } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import type { ServiceAlertsResponse } from '../services/service_alerts_count';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export type ServiceSloStatsResponse = Array<{
  serviceName: string;
  sloStatus: SloStatus;
  sloCount: number;
}>;

export interface ServiceMapServiceBadgesResponse {
  alerts: ServiceAlertsResponse;
  slos: ServiceSloStatsResponse;
}

export const serviceMapServiceBadgesRoute = defineRoute<ServiceMapServiceBadgesResponse>()({
  endpoint: 'POST /internal/apm/service-map/service_badges',
  params: t.type({
    query: t.intersection([environmentRt, rangeRt, t.partial({ kuery: t.string })]),
    body: t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
  }),
});
