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

/**
 * Row cap for the JSON format. The whole result set is held in memory, so this
 * is deliberately far below the product-level `rules.run.alerts.max` ceiling.
 */
export const NON_STREAMING_MAX_ROWS = 1000;

async function* yieldSingleBatch(response: EsqlQueryResponse): AsyncIterable<EsqlRow[]> {
  yield toRows(response, { normalizeDates: true });
}

/**
 * Single-shot ES|QL JSON query. Not a stream: it yields the full result set as
 * one in-memory batch, preserving the batched contract shared with the
 * streaming formats.
 */
export const jsonFormat = {
  name: 'json' as const,
  maxRows: NON_STREAMING_MAX_ROWS,
  async open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource> {
    const response = await esClient.esql.query(request, options);
    return { batches: yieldSingleBatch(response) };
  },
} satisfies EsqlResponseFormat;
