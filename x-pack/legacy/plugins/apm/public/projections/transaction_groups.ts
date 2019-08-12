/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import {
  TRANSACTION_NAME,
  PARENT_ID
} from '../../common/elasticsearch_fieldnames';
import { Options } from '../../server/lib/transaction_groups/fetcher';
import { getTransactionsProjection } from './transactions';
import { mergeProjection } from './util/merge_projection';

export function getTransactionGroupsProjection({
  setup,
  transactionName,
  options
}: {
  setup: Setup;
  transactionName?: string;
  options: Options;
}) {
  const transactionsProjection = getTransactionsProjection({
    setup,
    ...(options.type === 'top_transactions'
      ? {
          serviceName: options.serviceName,
          transactionType: options.transactionType
        }
      : {}),
    transactionName
  });

  const bool =
    options.type === 'top_traces'
      ? {
          must_not: [{ exists: { field: PARENT_ID } }]
        }
      : {};

  return mergeProjection(transactionsProjection, {
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
  });
}
