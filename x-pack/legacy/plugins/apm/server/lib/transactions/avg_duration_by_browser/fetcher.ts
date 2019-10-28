/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { ESFilter, ESSearchRequest } from '../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../typings/common';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  TRANSACTION_DURATION
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../helpers/range_filter';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Options } from '.';

export type ESResponse = PromiseReturnType<typeof fetcher>;
type Document = unknown;

export function fetcher(options: Options) {
  const { end, client, indices, start, uiFiltersES } = options.setup;
  const { serviceName } = options;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: 'page-load' } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        user_agent_keys: {
          terms: {
            field: USER_AGENT_NAME
          }
        },
        browsers: {
          date_histogram: {
            extended_bounds: {
              max: end,
              min: start
            },
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0
          },
          aggs: {
            user_agent: {
              terms: {
                field: USER_AGENT_NAME
              },
              aggs: {
                avg_duration: {
                  avg: {
                    field: TRANSACTION_DURATION
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  return client.search(params);
}
