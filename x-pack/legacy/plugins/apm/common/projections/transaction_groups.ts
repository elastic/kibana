/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../server/lib/helpers/setup_request';
import { TRANSACTION_NAME, PARENT_ID } from '../elasticsearch_fieldnames';
import { Options } from '../../server/lib/transaction_groups/fetcher';
import { getTransactionsProjection } from './transactions';
import { mergeProjection } from './util/merge_projection';

export function getTransactionGroupsProjection({
  setup,
  options
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  options: Options;
}) {
  const transactionsProjection = getTransactionsProjection({
    setup,
    ...(omit(options, 'type') as Omit<typeof options, 'type'>)
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
