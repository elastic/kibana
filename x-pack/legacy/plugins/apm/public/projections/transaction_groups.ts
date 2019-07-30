/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import { getBaseTransactionGroupsProjection } from './base_transaction_groups';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../common/elasticsearch_fieldnames';
import { mergeProjection } from './util/merge_projection';

export function getTransactionGroupsProjection({
  setup,
  serviceName,
  transactionType,
  transactionName
}: {
  setup: Setup;
  serviceName: string;
  transactionType: string;
  transactionName?: string;
}) {
  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const projection = getBaseTransactionGroupsProjection({ setup });
  return mergeProjection(projection, {
    body: {
      query: {
        bool: {
          filter: [
            ...projection.body.query.bool.filter,
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            ...transactionNameFilter
          ]
        }
      }
    }
  });
}
