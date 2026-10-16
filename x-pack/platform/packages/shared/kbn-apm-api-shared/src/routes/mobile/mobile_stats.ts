/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH } from '../../constants';

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
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
      }),
      query: z
        .object({
          transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
        })
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(environmentSchema)
        .merge(offsetSchema),
    })
  ),
});
