/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface ObservabilityOverviewResponse {
  serviceCount: number;
  transactionPerMinute: {
    value: number | undefined;
    timeseries: Array<{ x: number; y: number | null }>;
  };
}

export const observabilityOverviewRoute = defineRoute<ObservabilityOverviewResponse>()({
  endpoint: 'GET /internal/apm/observability_overview',
  params: t.type({
    query: t.intersection([rangeRt, t.type({ bucketSize: toNumberRt, intervalString: t.string })]),
  }),
});
