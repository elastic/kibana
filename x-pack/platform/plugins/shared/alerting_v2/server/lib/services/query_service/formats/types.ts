/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlRow } from '../row_coercion';

/**
 * The ES|QL request every format issues, built once by `QueryService` so a format
 * cannot drift on `drop_null_columns` or drop a caller-supplied filter.
 */
export type EsqlFormatRequest = Pick<
  EsqlQueryRequest,
  'query' | 'filter' | 'params' | 'drop_null_columns'
>;

/**
 * Transport options a format forwards verbatim to its Elasticsearch call.
 * `maxResponseSize` is absent unless the caller set one.
 */
export interface EsqlFormatRequestOptions {
  signal: AbortSignal;
  maxResponseSize?: number;
}

/**
 * An open ES|QL response: decoded row batches plus, when the format holds
 * resources, how to release them. `QueryService` owns the iteration, the abort
 * checks and the cleanup, so implementations only decode.
 */
export interface EsqlRowBatchSource {
  readonly batches: AsyncIterable<EsqlRow[]>;
  close?(): Promise<void>;
}

/**
 * Strategy describing how one ES|QL response format is requested and decoded.
 * Formats are stateless singletons; the Elasticsearch client is passed in so one
 * instance serves every `QueryService` flavor.
 */
export interface EsqlResponseFormat {
  /** Value operators set in `xpack.alerting_v2.esql.responseFormat`. */
  readonly name: string;
  /**
   * Upper bound on rows a single execution may request in this format. Omitted
   * by formats that stream and impose no cap of their own.
   */
  readonly maxRows?: number;
  open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource>;
}
