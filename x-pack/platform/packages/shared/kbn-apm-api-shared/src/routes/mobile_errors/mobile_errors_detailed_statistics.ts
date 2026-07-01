/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import { type Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface MobileErrorGroupDetailedStat {
  groupId: string;
  timeseries: Coordinate[];
}

export interface MobileErrorGroupPeriodsResponse {
  currentPeriod: Record<string, MobileErrorGroupDetailedStat>;
  previousPeriod: Record<string, MobileErrorGroupDetailedStat>;
}

export const mobileErrorsDetailedStatisticsRoute = defineRoute<MobileErrorGroupPeriodsResponse>()({
  endpoint: 'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({
        numBuckets: toNumberRt,
      }),
    ]),
    body: t.type({ groupIds: jsonRt.pipe(t.array(t.string)) }),
  }),
});
