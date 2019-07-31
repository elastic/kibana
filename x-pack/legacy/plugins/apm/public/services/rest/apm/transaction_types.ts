/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransactionTypesAPIResponse } from '../../../../server/lib/transaction_types/get_transaction_types';
import { callApi } from '../callApi';

export async function loadTransactionTypes({
  serviceName,
  start,
  end
}: {
  serviceName: string | undefined;
  start: string;
  end: string;
}) {
  const { transactionTypes } = await callApi<TransactionTypesAPIResponse>({
    pathname: `/api/apm/transaction_types`,
    query: {
      start,
      end,
      serviceName
    }
  });
  return transactionTypes;
}
