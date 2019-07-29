/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransactionBreakdownAPIResponse } from '../../../../server/lib/transactions/breakdown';
import { TimeSeriesAPIResponse } from '../../../../server/lib/transactions/charts';
import { TransactionDistributionAPIResponse } from '../../../../server/lib/transactions/distribution';
import { callApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { TransactionGroupListAPIResponse } from '../../../../server/lib/transaction_groups';

export async function loadTransactionList({
  serviceName,
  start,
  end,
  uiFilters,
  transactionType
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType: string;
  uiFilters: UIFilters;
}) {
  return await callApi<TransactionGroupListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups`,
    query: {
      start,
      end,
      transactionType,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadTransactionDistribution({
  serviceName,
  start,
  end,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  uiFilters
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType: string;
  transactionName: string;
  transactionId?: string;
  traceId?: string;
  uiFilters: UIFilters;
}) {
  return callApi<TransactionDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/distribution`,
    query: {
      start,
      end,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadTransactionCharts({
  serviceName,
  start,
  end,
  uiFilters,
  transactionType,
  transactionName
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  transactionName?: string;
  uiFilters: UIFilters;
}) {
  return callApi<TimeSeriesAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/charts`,
    query: {
      start,
      end,
      transactionType,
      transactionName,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadTransactionBreakdown({
  serviceName,
  start,
  end,
  transactionName,
  transactionType,
  uiFilters
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionName?: string;
  transactionType: string;
  uiFilters: UIFilters;
}) {
  return callApi<TransactionBreakdownAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/breakdown`,
    query: {
      start,
      end,
      transactionName,
      transactionType,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}
