/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadServiceTransactionTypes } from '../services/rest/apm/services';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';

export function useServiceTransactionTypes(urlParams: IUrlParams) {
  const { serviceName, start, end } = urlParams;
  const { data: transactionTypes = [] } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadServiceTransactionTypes({ serviceName, start, end });
    }
  }, [serviceName, start, end]);

  return transactionTypes;
}
