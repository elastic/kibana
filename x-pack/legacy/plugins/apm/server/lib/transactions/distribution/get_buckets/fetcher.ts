/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE
} from '../../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../../helpers/setup_request';

export async function bucketFetcher(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  traceId: string,
  distributionMax: number,
  bucketSize: number,
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
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ],
          should: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [TRANSACTION_ID]: transactionId } }
          ]
        }
      },
      aggs: {
        distribution: {
          histogram: {
            field: TRANSACTION_DURATION,
            interval: bucketSize,
            min_doc_count: 0,
            extended_bounds: {
              min: 0,
              max: distributionMax
            }
          },
          aggs: {
            samples: {
              filter: {
                term: { [TRANSACTION_SAMPLED]: true }
              },
              aggs: {
                items: {
                  top_hits: {
                    _source: [TRANSACTION_ID, TRACE_ID],
                    size: 10
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const response = await client.search<Transaction, typeof params>(params);

  return response;
}
