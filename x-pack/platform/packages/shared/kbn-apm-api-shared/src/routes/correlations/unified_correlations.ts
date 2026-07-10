/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt, type CorrelationsResponse } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';
import { entityTypeRt, metricRt } from './types';

export type UnifiedCorrelationsRouteResponse = CorrelationsResponse;

export const unifiedCorrelationsRoute = defineRoute<UnifiedCorrelationsRouteResponse>()({
  endpoint: 'POST /internal/apm/correlations',
  params: t.type({
    body: t.intersection([
      t.type({
        entityType: entityTypeRt,
        metric: metricRt,
      }),
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        fieldCandidates: t.array(t.string),
        durationMin: toNumberRt,
        durationMax: toNumberRt,
        percentileThreshold: toNumberRt,
        includeHistogram: toBooleanRt,
        kuery: t.string,
      }),
      t.partial(environmentRt.props),
      rangeRt,
    ]),
  }),
});
