/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { metricsChartDataByAgentRoute } from '../../../../server/routes/metrics/metrics_chart_data_by_agent_route';

export async function loadMetricsChartData({
  serviceName,
  agentName,
  start,
  end,
  uiFilters
}: {
  serviceName: string;
  agentName: string;
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApmApi<typeof metricsChartDataByAgentRoute>({
    pathname: `/api/apm/services/${serviceName}/metrics/charts`,
    query: {
      start,
      end,
      agentName,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}
