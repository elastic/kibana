/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeSeriesAPIResponse } from '../../../../server/lib/transactions/charts';
import { ITransactionDistributionAPIResponse } from '../../../../server/lib/transactions/distribution';
import { TransactionListAPIResponse } from '../../../../server/lib/transactions/get_top_transactions';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';

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
  return await callApi<TransactionListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups`,
    query: {
      start,
      end,
      transactionType,
      uiFiltersES: await getUiFiltersES(uiFilters)
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
  return callApi<ITransactionDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/distribution`,
    query: {
      start,
      end,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      uiFiltersES: await getUiFiltersES(uiFilters)
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
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
