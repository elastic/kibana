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

/**
 * Rows per batch yielded by the JSON format. The raw response is still
 * materialised in full (that is the format's limit), but slicing bounds every
 * downstream copy — row objects, alert events, bulk bodies — to one slice at a
 * time instead of the whole result set.
 */
export const JSON_STREAM_BATCH_SIZE = 100;

async function* yieldRowSlices(response: EsqlQueryResponse): AsyncIterable<EsqlRow[]> {
  const { values } = response;

  for (let start = 0; start < values.length; start += JSON_STREAM_BATCH_SIZE) {
    const slice = values.slice(start, start + JSON_STREAM_BATCH_SIZE);
    yield toRows({ ...response, values: slice }, { normalizeDates: true });
  }
}

/**
 * Single-shot ES|QL JSON query. Not a stream: the whole result set arrives in
 * one response, which is then yielded in `JSON_STREAM_BATCH_SIZE` slices to
 * preserve the batched contract shared with the streaming formats.
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
    return { batches: yieldRowSlices(response) };
  },
} satisfies EsqlResponseFormat;
