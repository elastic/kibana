/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { callApmApi } from '../services/rest/callApmApi';

export function useTransactionBreakdown() {
  const {
    urlParams: { serviceName, start, end, transactionName, transactionType },
    uiFilters
  } = useUrlParams();

  const {
    data = { kpis: [], timeseries: [] },
    error,
    status
  } = useFetcher(() => {
    if (serviceName && start && end && transactionType) {
      return callApmApi({
        pathname:
          '/api/apm/services/{serviceName}/transaction_groups/breakdown',
        params: {
          path: { serviceName },
          query: {
            start,
            end,
            transactionName,
            transactionType,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    }
  }, [serviceName, start, end, transactionType, transactionName, uiFilters]);

  const receivedDataDuringLifetime = useRef(false);

  if (data && data.kpis.length) {
    receivedDataDuringLifetime.current = true;
  }

  return {
    data,
    status,
    error,
    receivedDataDuringLifetime: receivedDataDuringLifetime.current
  };
}
