/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

interface MobileStatsTimeseries {
  x: number;
  y: number;
}

interface MobileStats {
  sessions: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  requests: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  crashRate: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
  launchTimes: { timeseries: MobileStatsTimeseries[]; value: number | null | undefined };
}

export interface MobilePeriodStats {
  currentPeriod: MobileStats;
  previousPeriod: MobileStats;
}

export const mobileStatsRoute = defineRoute<MobilePeriodStats>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/stats',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        transactionType: z.string().optional(),
      })
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(environmentSchema)
      .merge(offsetSchema),
  }),
});
