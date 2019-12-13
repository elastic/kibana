/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ERROR_LOG_LEVEL,
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../helpers/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ErrorRaw } from '../../../typings/es_schemas/raw/ErrorRaw';

export interface ErrorsPerTransaction {
  [transactionId: string]: {
    count: number;
    error: ErrorRaw;
  };
}

const includedLogLevels = ['critical', 'error', 'fatal'];

export async function getTraceErrorsPerTransaction(
  traceId: string,
  setup: Setup & SetupTimeRange
): Promise<ErrorsPerTransaction> {
  const { start, end, client, indices } = setup;

  const params = {
    index: indices['apm_oss.errorIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { range: rangeFilter(start, end) }
          ],
          should: [
            { bool: { must_not: [{ exists: { field: ERROR_LOG_LEVEL } }] } },
            { terms: { [ERROR_LOG_LEVEL]: includedLogLevels } }
          ]
        }
      },
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_ID,
            // high cardinality
            execution_hint: 'map'
          },
          aggs: {
            error: {
              top_hits: {
                size: 1
              }
            }
          }
        }
      }
    }
  } as const;

  const resp = await client.search(params);

  return (resp.aggregations?.transactions.buckets || []).reduce(
    (acc, bucket) => ({
      ...acc,
      [bucket.key]: {
        count: bucket.doc_count,
        error: bucket.error.hits.hits[0]?._source
      }
    }),
    {}
  );
}
