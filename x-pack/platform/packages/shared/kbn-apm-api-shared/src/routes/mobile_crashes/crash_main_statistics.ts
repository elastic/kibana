/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH } from '../../constants';

export type MobileCrashGroupMainStatisticsResponse = Array<{
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
  culprit: string | undefined;
  handled: boolean | undefined;
  type: string | undefined;
}>;

export interface CrashMainStatisticsRouteResponse {
  errorGroups: MobileCrashGroupMainStatisticsResponse;
}

export const crashMainStatisticsRoute = defineRoute<CrashMainStatisticsRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics',
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
      }),
      query: z
        .object({
          sortField: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    })
  ),
});
