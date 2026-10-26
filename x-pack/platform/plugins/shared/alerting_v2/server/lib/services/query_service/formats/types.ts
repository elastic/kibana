/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlRow } from '../row_coercion';

export type EsqlFormatRequest = Pick<
  EsqlQueryRequest,
  'query' | 'filter' | 'params' | 'drop_null_columns'
>;

export interface EsqlFormatRequestOptions {
  signal: AbortSignal;
  maxResponseSize?: number;
}

export interface EsqlRowBatchSource {
  readonly batches: AsyncIterable<EsqlRow[]>;
  close?(): Promise<void>;
}

export interface EsqlResponseFormat {
  readonly name: string;
  readonly maxRows?: number;
  open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource>;
}
