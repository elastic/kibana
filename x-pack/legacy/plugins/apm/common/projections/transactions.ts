/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
  TRANSACTION_NAME
} from '../elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getTransactionsProjection({
  setup,
  serviceName,
  transactionName,
  transactionType
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypeFilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];
  const serviceNameFilter = serviceName
    ? [{ term: { [SERVICE_NAME]: serviceName } }]
    : [];

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [PROCESSOR_EVENT]: 'transaction' } },
      ...transactionNameFilter,
      ...transactionTypeFilter,
      ...serviceNameFilter,
      ...uiFiltersES
    ]
  };

  return {
    index: indices['apm_oss.transactionIndices'],
    body: {
      query: {
        bool
      }
    }
  };
}
