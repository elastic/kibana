/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { useUiFilters } from '../context/UrlParamsContext';
import { TransactionDistributionAPIResponse } from '../../server/lib/transactions/distribution';

const INITIAL_DATA = {
  buckets: [] as TransactionDistributionAPIResponse['buckets'],
  noHits: true,
  bucketSize: 0
};

export function useTransactionDistribution(urlParams: IUrlParams) {
  const {
    serviceName,
    start,
    end,
    transactionType,
    transactionId,
    traceId,
    transactionName
  } = urlParams;
  const uiFilters = useUiFilters(urlParams);

  const { data = INITIAL_DATA, status, error } = useFetcher(
    callApmApi => {
      if (serviceName && start && end && transactionType && transactionName) {
        return callApmApi({
          pathname:
            '/api/apm/services/{serviceName}/transaction_groups/distribution',
          params: {
            path: {
              serviceName
            },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              transactionId,
              traceId,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    // the histogram should not be refetched if the transactionId or traceId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceName, start, end, transactionType, transactionName, uiFilters]
  );

  return { data, status, error };
}
