/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeSeriesAPIResponse } from '../../../../server/lib/transactions/charts';
import { ITransactionDistributionAPIResponse } from '../../../../server/lib/transactions/distribution';
import { TransactionListAPIResponse } from '../../../../server/lib/transactions/get_top_transactions';
import { MissingArgumentsError } from '../../../hooks/useFetcher';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadTransactionList({
  serviceName,
  start,
  end,
  kuery,
  transactionType
}: IUrlParams) {
  if (!(serviceName && transactionType && start && end)) {
    throw new MissingArgumentsError();
  }

  return await callApi<TransactionListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
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
  kuery
}: IUrlParams) {
  if (!(serviceName && transactionName && transactionType && start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<ITransactionDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/${encodeURIComponent(
      transactionName
    )}/distribution`,
    query: {
      start,
      end,
      transactionId,
      traceId,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadTransactionDetailsCharts({
  serviceName,
  start,
  end,
  kuery,
  transactionType,
  transactionName
}: IUrlParams) {
  if (!(serviceName && transactionName && transactionType && start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<TimeSeriesAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/${encodeURIComponent(
      transactionName
    )}/charts`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadTransactionOverviewCharts({
  serviceName,
  start,
  end,
  kuery,
  transactionType
}: IUrlParams) {
  if (!(serviceName && start && end)) {
    throw new MissingArgumentsError();
  }

  const pathname = transactionType
    ? `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/charts`
    : `/api/apm/services/${serviceName}/transaction_groups/charts`;

  return callApi<TimeSeriesAPIResponse>({
    pathname,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
