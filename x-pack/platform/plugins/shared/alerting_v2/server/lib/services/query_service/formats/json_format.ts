/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlRow } from '../row_coercion';
import { toRows } from '../row_coercion';
import type {
  EsqlFormatRequest,
  EsqlFormatRequestOptions,
  EsqlResponseFormat,
  EsqlRowBatchSource,
} from './types';

export const NON_STREAMING_MAX_ROWS = 1000;

export const JSON_STREAM_BATCH_SIZE = 100;

async function* yieldRowSlices(response: EsqlQueryResponse): AsyncIterable<EsqlRow[]> {
  const { values } = response;

  for (let start = 0; start < values.length; start += JSON_STREAM_BATCH_SIZE) {
    const slice = values.slice(start, start + JSON_STREAM_BATCH_SIZE);
    yield toRows({ ...response, values: slice }, { normalizeDates: true });
  }
}

export const jsonFormat = {
  name: 'json' as const,
  maxRows: NON_STREAMING_MAX_ROWS,
  async open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource> {
    const response = await esClient.esql.query(request, options);
    return { batches: yieldRowSlices(response) };
  },
} satisfies EsqlResponseFormat;
