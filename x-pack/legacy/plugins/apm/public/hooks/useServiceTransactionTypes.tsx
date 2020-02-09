/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';

const INITIAL_DATA = { transactionTypes: [] };

export function useServiceTransactionTypes(urlParams: IUrlParams) {
  const { serviceName, start, end } = urlParams;
  const { data = INITIAL_DATA } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/transaction_types',
          params: {
            path: { serviceName },
            query: { start, end }
          }
        });
      }
    },
    [serviceName, start, end]
  );

  return data.transactionTypes;
}
