/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  TRANSACTION_SAMPLED,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getBaseTransactionGroupsProjection({
  setup,
  transactionType
}: {
  setup: Setup;
  transactionType?: string;
}) {
  const { start, end, uiFiltersES, config } = setup;

  const transactionTypeFilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const bool = {
    // prefer sampled transactions
    should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [PROCESSOR_EVENT]: 'transaction' } },
      ...transactionTypeFilter,
      ...uiFiltersES
    ]
  };

  return {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      query: {
        bool
      },
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_NAME
          }
        }
      }
    }
  };
}
