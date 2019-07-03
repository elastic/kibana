/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import { useFetcher } from './useFetcher';
import { callApi } from '../services/rest/callApi';
import { getUiFiltersES } from '../services/ui_filters/get_ui_filters_es';
import { TransactionBreakdownAPIResponse } from '../../server/lib/transactions/breakdown';
import { useUrlParams } from './useUrlParams';

export function useTransactionBreakdown() {
  const {
    urlParams: { serviceName, start, end, transactionName },
    uiFilters
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    async () => {
      if (serviceName && start && end) {
        return callApi<TransactionBreakdownAPIResponse>({
          pathname: `/api/apm/services/${serviceName}/transaction_groups/breakdown`,
          query: {
            start,
            end,
            transactionName,
            uiFiltersES: await getUiFiltersES(uiFilters)
          }
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

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
