/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getMetricsChartDataByAgent } from '../lib/metrics/get_metrics_chart_data_by_agent';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';

export const metricsChartsRoute = createRoute(() => ({
  path: `/api/apm/services/{serviceName}/metrics/charts`,
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        agentName: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async (req, { path, query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    const { agentName } = query;
    return await getMetricsChartDataByAgent({
      setup,
      serviceName,
      agentName
    });
  }
}));
