/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import type { Maybe } from '@kbn/apm-types-shared';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

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
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        locationField: z.string().optional(),
      })
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(environmentSchema)
      .merge(offsetSchema),
  }),
});
