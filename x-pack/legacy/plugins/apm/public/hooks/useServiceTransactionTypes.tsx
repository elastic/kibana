/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';
import { callApmApi } from '../services/rest/callApi';

export function useServiceTransactionTypes(urlParams: IUrlParams) {
  const { serviceName, start, end } = urlParams;
  const { data = { transactionTypes: [] as string[] } } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/transaction_types',
        params: {
          path: { serviceName },
          query: { start, end }
        }
      });
    }
  }, [serviceName, start, end]);

  return data.transactionTypes;
}
