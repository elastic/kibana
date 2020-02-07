/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsChartsByAgentAPIResponse } from '../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';

const INITIAL_DATA: MetricsChartsByAgentAPIResponse = {
  charts: []
};

export function useServiceMetricCharts(
  urlParams: IUrlParams,
  agentName?: string
) {
  const { serviceName, start, end, serviceNodeName } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = INITIAL_DATA, error, status } = useFetcher(
    callApmApi => {
      if (serviceName && start && end && agentName) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/metrics/charts',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              agentName,
              serviceNodeName,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, agentName, serviceNodeName, uiFilters]
  );

  return {
    data,
    status,
    error
  };
}
