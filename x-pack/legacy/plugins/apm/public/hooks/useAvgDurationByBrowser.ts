/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { AvgDurationByBrowserAPIResponse } from '../../server/lib/transactions/avg_duration_by_browser';
import { TimeSeries } from '../../typings/timeseries';
import { getVizColorForIndex } from '../../common/viz_colors';

function toTimeSeries(data?: AvgDurationByBrowserAPIResponse): TimeSeries[] {
  if (!data) {
    return [];
  }

  return data.map((item, index) => {
    return {
      ...item,
      color: getVizColorForIndex(index, theme),
      type: 'linemark'
    };
  });
}

export function useAvgDurationByBrowser() {
  const {
    urlParams: { serviceName, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname:
            '/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_browser',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionName,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, transactionName, uiFilters]
  );

  return {
    data: toTimeSeries(data),
    status,
    error
  };
}
