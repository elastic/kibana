/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../server/lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  ERROR_GROUP_ID,
  TRANSACTION_TYPE
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getErrorGroupsProjection({
  setup,
  serviceName,
  transactionType
}: {
  setup: Setup;
  serviceName: string;
  transactionType?: string;
}) {
  const { start, end, uiFiltersES, config } = setup;

  const transactionTypeFilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  return {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { range: rangeFilter(start, end) },
            ...transactionTypeFilter,
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        error_groups: {
          terms: {
            field: ERROR_GROUP_ID
          }
        }
      }
    }
  };
}
