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
import { PromiseValueType } from '../../../typings/common';

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

  const errorResponsePromise = client.search({
    index: indices['apm_oss.errorIndices'],
    body: {
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { range: rangeFilter(start, end) }
          ],
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } }
        }
      },
      aggs: {
        by_transaction_id: {
          terms: {
            field: TRANSACTION_ID,
            size: maxTraceItems,
            // high cardinality
            execution_hint: 'map' as const
          }
        }
      }
    }
  });

  const traceResponsePromise = client.search({
    index: [
      indices['apm_oss.spanIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { terms: { [PROCESSOR_EVENT]: ['span', 'transaction'] } },
            { range: rangeFilter(start, end) }
          ],
          should: {
            exists: { field: PARENT_ID }
          }
        }
      },
      sort: [
        { _score: { order: 'asc' as const } },
        { [TRANSACTION_DURATION]: { order: 'desc' as const } },
        { [SPAN_DURATION]: { order: 'desc' as const } }
      ],
      track_total_hits: true
    }
  });

  const [errorResponse, traceResponse]: [
    // explicit intermediary types to avoid TS "excessively deep" error
    PromiseValueType<typeof errorResponsePromise>,
    PromiseValueType<typeof traceResponsePromise>
    // @ts-ignore
  ] = await Promise.all([errorResponsePromise, traceResponsePromise]);

  const exceedsMax = traceResponse.hits.total.value > maxTraceItems;

  const items = (traceResponse.hits.hits as Array<{
    _source: Transaction | Span;
  }>).map(hit => hit._source);

  const errorFrequencies: {
    errorsPerTransaction: ErrorsPerTransaction;
    errorDocs: APMError[];
  } = {
    errorDocs: errorResponse.hits.hits.map(
      ({ _source }) => _source as APMError
    ),
    errorsPerTransaction:
      errorResponse.aggregations?.by_transaction_id.buckets.reduce(
        (acc, current) => {
          return {
            ...acc,
            [current.key]: current.doc_count
          };
        },
        {} as ErrorsPerTransaction
      ) ?? {}
  };

  return {
    items,
    exceedsMax,
    ...errorFrequencies
  };
}
