/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import { Setup } from '../../server/lib/helpers/setup_request';
import { TRANSACTION_NAME } from '../elasticsearch_fieldnames';
import { Options } from '../../server/lib/transaction_groups/fetcher';
import { getTransactionsProjection } from './transactions';
import { mergeProjection } from './util/merge_projection';

export function getTransactionGroupsProjection({
  setup,
  options
}: {
  setup: Setup;
  options: Options;
}) {
  const transactionsProjection = getTransactionsProjection({
    setup,
    ...(omit(options, 'type') as Omit<Options, 'type'>)
  });

  const projection = mergeProjection(transactionsProjection, {
    body: {
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_NAME
          }
        }
      }
    }
  });

  return projection;
}
