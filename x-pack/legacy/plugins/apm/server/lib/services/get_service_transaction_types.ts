/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../helpers/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getServiceTransactionTypes(
  serviceName: string,
  setup: Setup & SetupTimeRange
) {
  const { start, end, client, indices } = setup;

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { terms: { [PROCESSOR_EVENT]: ['transaction'] } },
            { range: rangeFilter(start, end) }
          ]
        }
      },
      aggs: {
        types: {
          terms: { field: TRANSACTION_TYPE, size: 100 }
        }
      }
    }
  };

  const { aggregations } = await client.search(params);
  const transactionTypes =
    aggregations?.types.buckets.map(bucket => bucket.key as string) || [];
  return { transactionTypes };
}
