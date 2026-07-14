/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

export interface MobileErrorGroupDetailedStat {
  groupId: string;
  timeseries: Coordinate[];
}

export interface MobileErrorGroupPeriodsResponse {
  currentPeriod: Record<string, MobileErrorGroupDetailedStat>;
  previousPeriod: Record<string, MobileErrorGroupDetailedStat>;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value is an array of strings.
const groupIdsJsonSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string()));

export const mobileErrorsDetailedStatisticsRoute = defineRoute<MobileErrorGroupPeriodsResponse>()({
  endpoint: 'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: environmentSchema
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(offsetSchema)
      .merge(
        z.object({
          numBuckets: z.coerce.number(),
        })
      ),
    body: z.object({ groupIds: groupIdsJsonSchema }),
  }),
});
