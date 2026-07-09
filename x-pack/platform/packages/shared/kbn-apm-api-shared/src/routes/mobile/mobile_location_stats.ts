/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import type { Maybe } from '@kbn/apm-types-shared';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

type Timeseries = Array<{ x: number; y: number }>;

interface LocationStats {
  mostSessions: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostRequests: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostCrashes: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostLaunches: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
}

export interface MobileLocationStats {
  currentPeriod: LocationStats;
  previousPeriod: LocationStats;
}

export const mobileLocationStatsRoute = defineRoute<MobileLocationStats>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/location/stats',
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
        locationField: t.string,
      }),
    ]),
  }),
});
