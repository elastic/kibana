/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { type Coordinate } from '@kbn/apm-types';

import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface HttpRequestsTimeseries {
  currentPeriod: { timeseries: Coordinate[]; value: number | null | undefined };
  previousPeriod: { timeseries: Coordinate[]; value: number | null | undefined };
}

export const mobileHttpRequestsRoute = defineRoute<HttpRequestsTimeseries>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      offsetRt,
      t.partial({
        transactionType: t.string,
        transactionName: t.string,
      }),
    ]),
  }),
});
