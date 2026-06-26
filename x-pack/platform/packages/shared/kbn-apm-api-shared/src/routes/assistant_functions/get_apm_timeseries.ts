/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { getApmTimeseriesRt, type ApmTimeseries } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface GetApmTimeseriesResponse {
  content: Array<Omit<ApmTimeseries, 'data'>>;
  data: ApmTimeseries[];
}

export const getApmTimeseriesRoute = defineRoute<GetApmTimeseriesResponse>()({
  endpoint: 'POST /internal/apm/assistant/get_apm_timeseries',
  params: t.type({
    body: getApmTimeseriesRt,
  }),
});
