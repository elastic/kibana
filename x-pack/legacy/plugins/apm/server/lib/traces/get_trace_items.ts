/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  TRACE_ID,
  PARENT_ID,
  TRANSACTION_DURATION,
  SPAN_DURATION,
  TRANSACTION_ID,
  ERROR_LOG_LEVEL
} from '../../../common/elasticsearch_fieldnames';
import { Span } from '../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../typings/es_schemas/ui/APMError';
import { rangeFilter } from '../helpers/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

interface ErrorsPerTransaction {
  [transactionId: string]: number;
}

export async function getTraceItems(
  traceId: string,
  setup: Setup & SetupTimeRange
) {
  const { start, end, client, config, indices } = setup;
  const maxTraceItems = config['xpack.apm.ui.maxTraceItems'];
  const excludedLogLevels = ['debug', 'info', 'warning'];

  const params = {
    index: [
      indices['apm_oss.spanIndices'],
      indices['apm_oss.transactionIndices'],
      indices['apm_oss.errorIndices']
    ],
    body: {
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { terms: { [PROCESSOR_EVENT]: ['span', 'transaction', 'error'] } },
            { range: rangeFilter(start, end) }
          ],
          should: {
            exists: { field: PARENT_ID }
          },
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } }
        }
      },
      sort: [
        { _score: { order: 'asc' as const } },
        { [TRANSACTION_DURATION]: { order: 'desc' as const } },
        { [SPAN_DURATION]: { order: 'desc' as const } }
      ],
      track_total_hits: true,
      aggs: {
        errors: {
          filter: { term: { [PROCESSOR_EVENT]: 'error' } },
          aggs: {
            transactions: {
              terms: {
                field: TRANSACTION_ID,
                // high cardinality
                execution_hint: 'map' as const
              },
              aggs: {
                top_transactions_errors_hits: {
                  top_hits: { size: 100 }
                }
              }
            }
          }
        }
      },
      post_filter: {
        terms: { [PROCESSOR_EVENT]: ['span', 'transaction'] }
      }
    }
  };

  const resp = await client.search(params);
  const transactionsBuckets = resp.aggregations?.errors.transactions.buckets;

  const items = (resp.hits.hits as Array<{ _source: Transaction | Span }>).map(
    hit => hit._source
  );
  const exceedsMax = resp.hits.total.value > maxTraceItems;

  if (transactionsBuckets && transactionsBuckets.length) {
    const errorFrequencies: {
      errorsPerTransaction: ErrorsPerTransaction;
      errorDocs: APMError[];
    } = transactionsBuckets.reduce(
      (
        { errorsPerTransaction, errorDocs },
        { key, doc_count, top_transactions_errors_hits }
      ) => {
        const topHitsErrorsHits = top_transactions_errors_hits.hits
          .hits as Array<{ _source: APMError }>;
        const topHitsErrors = topHitsErrorsHits.map(({ _source }) => _source);
        return {
          errorsPerTransaction: {
            ...errorsPerTransaction,
            [key]: doc_count
          },
          errorDocs: [...errorDocs, ...topHitsErrors]
        };
      },
      {
        errorsPerTransaction: {} as ErrorsPerTransaction,
        errorDocs: [] as APMError[]
      }
    );

    return {
      items,
      exceedsMax,
      errorsPerTransaction: errorFrequencies.errorsPerTransaction,
      errorDocs: errorFrequencies.errorDocs
    };
  }

  return {
    items,
    exceedsMax,
    errorsPerTransaction: {} as ErrorsPerTransaction,
    errorDocs: [] as APMError[]
  };
}
