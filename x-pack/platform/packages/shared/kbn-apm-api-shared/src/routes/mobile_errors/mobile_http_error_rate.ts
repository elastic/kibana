/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { type Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface MobileHttpErrorsTimeseries {
  currentPeriod: { timeseries: Coordinate[] };
  previousPeriod: { timeseries: Coordinate[] };
}

export const mobileHttpErrorRateRoute = defineRoute<MobileHttpErrorsTimeseries>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
  }),
});
