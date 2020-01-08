/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../helpers/setup_request';

export async function getDistributionMax(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  setup: Setup & SetupTimeRange & SetupUIFilters
) {
  const { start, end, uiFiltersES, client, indices } = setup;

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [TRANSACTION_NAME]: transactionName } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        stats: {
          extended_stats: {
            field: TRANSACTION_DURATION
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  return resp.aggregations ? resp.aggregations.stats.max : null;
}
