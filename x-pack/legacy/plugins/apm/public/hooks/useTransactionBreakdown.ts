/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { loadTransactionBreakdown } from '../services/rest/apm/transaction_groups';

export function useTransactionBreakdown() {
  const {
    urlParams: { serviceName, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const {
    data = { kpis: [], timeseries: [] },
    error,
    status
  } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadTransactionBreakdown({
        start,
        end,
        serviceName,
        transactionName,
        uiFilters
      });
    }
  }, [serviceName, start, end, uiFilters]);

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
