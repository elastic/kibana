/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { callApmApi } from '../services/rest/callApmApi';

export function useAvgDurationByCountry() {
  const {
    urlParams: { serviceName, start, end },
    uiFilters
  } = useUrlParams();

  const { data = [], error, status } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname:
          '/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_country',
        params: {
          path: { serviceName },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    }
  }, [serviceName, start, end, uiFilters]);

  return {
    data,
    status,
    error
  };
}
