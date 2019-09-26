/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export type ServiceTransactionTypesAPIResponse = PromiseReturnType<
  typeof getServiceTransactionTypes
>;
export async function getServiceTransactionTypes(
  serviceName: string,
  setup: Setup
) {
  const { start, end, client, config } = setup;

  const params = {
    index: [config.get<string>('apm_oss.transactionIndices')],
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
  const buckets = idx(aggregations, _ => _.types.buckets) || [];
  const transactionTypes = buckets.map(bucket => bucket.key);
  return { transactionTypes };
}
