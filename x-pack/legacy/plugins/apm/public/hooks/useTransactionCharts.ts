/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { loadTransactionCharts } from '../services/rest/apm/transaction_groups';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

export function useTransactionCharts() {
  const {
    urlParams: { serviceName, transactionType, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const { data, error, status } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadTransactionCharts({
        serviceName,
        start,
        end,
        transactionName,
        transactionType,
        uiFilters
      });
    }
  }, [serviceName, start, end, transactionName, transactionType, uiFilters]);

  const memoizedData = useMemo(
    () => getTransactionCharts({ transactionType }, data),
    [data]
  );

  return {
    data: memoizedData,
    status,
    error
  };
}
