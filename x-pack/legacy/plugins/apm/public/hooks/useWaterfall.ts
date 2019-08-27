/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { getWaterfall } from '../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { callApmApi } from '../services/rest/callApmApi';

const INITIAL_DATA = {
  root: undefined,
  trace: { items: [], exceedsMax: false },
  errorsPerTransaction: {}
};

export function useWaterfall(urlParams: IUrlParams) {
  const { traceId, start, end, transactionId } = urlParams;
  const { data = INITIAL_DATA, status, error } = useFetcher(() => {
    if (traceId && start && end) {
      return callApmApi({
        pathname: '/api/apm/traces/{traceId}',
        params: {
          path: { traceId },
          query: {
            start,
            end
          }
        }
      });
    }
  }, [traceId, start, end]);

  const waterfall = useMemo(() => getWaterfall(data, transactionId), [
    data,
    transactionId
  ]);

  return { data: waterfall, status, error, exceedsMax: data.trace.exceedsMax };
}
