/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { useUiFilters } from '../context/UrlParamsContext';
import { callApmApi } from '../services/rest/callApmApi';
import { TransactionDistributionAPIResponse } from '../../server/lib/transactions/distribution';

const INITIAL_DATA = {
  buckets: [] as TransactionDistributionAPIResponse['buckets'],
  totalHits: 0,
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

  const { data, status, error } = useFetcher(
    prevResult => {
      // if a previous transaction distribution has been loaded and includes the sample
      // there is no reason to loading it again
      const alreadyHasSample = prevResult.data.buckets.some(bucket => {
        return (
          bucket.sample &&
          bucket.sample.traceId === traceId &&
          bucket.sample.transactionId === transactionId
        );
      });

      if (
        !alreadyHasSample &&
        serviceName &&
        start &&
        end &&
        transactionType &&
        transactionName
      ) {
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
    [
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      uiFilters
    ],
    { initialState: INITIAL_DATA }
  );

  return { data, status, error };
}
