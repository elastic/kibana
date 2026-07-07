/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldValue,
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isValidTraceId } from '@opentelemetry/api';
import { LOGS_INDEX_PATTERN, TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import type { TraceAccessor } from './types';

const TRACE_SOURCE = {
  traces: { index: TRACES_INDEX_PATTERN, field: 'trace.id' },
  logs: { index: LOGS_INDEX_PATTERN, field: 'trace_id' },
} as const;

export type TraceSource = keyof typeof TRACE_SOURCE;

export interface TraceDslSearchParams {
  filter: QueryDslQueryContainer[];
  sort?: Sort;
  size?: number;
  fields: string[];
}

export interface TraceAccessorWithEsql extends TraceAccessor {
  runEsql(source: TraceSource, pipeline: string): Promise<ESQLSearchResponse>;
  /**
   * Query DSL alternative to `runEsql`. Reads from `_source`, so unlike ES|QL
   * (which reads doc values) it still returns fields whose value exceeded a
   * keyword's `ignore_above` and was therefore excluded from the index/doc
   * values (marked `_ignored`) — e.g. long `gen_ai.*` event content.
   */
  search<TDocument = Record<string, unknown>>(
    source: TraceSource,
    params: TraceDslSearchParams
  ): Promise<TDocument[]>;
}

const assertValidTraceId = (traceId: string): void => {
  if (!isValidTraceId(traceId)) {
    throw new Error('Invalid trace_id: must be a 32-character hex string');
  }
};

export const createTraceAccessor = (traceAccessor: TraceAccessor): TraceAccessorWithEsql => ({
  ...traceAccessor,
  runEsql: async (source: TraceSource, pipeline: string) => {
    assertValidTraceId(traceAccessor.traceId);
    const { index, field } = TRACE_SOURCE[source];
    const query = `FROM ${index}\n| WHERE ${field} == ?trace_id\n${pipeline}`;
    const params = [{ trace_id: traceAccessor.traceId }] as unknown as FieldValue[];
    return (await traceAccessor.esClient.esql.query({ query, params })) as ESQLSearchResponse;
  },
  search: async <TDocument = Record<string, unknown>>(
    source: TraceSource,
    { filter, sort, size = 1000, fields }: TraceDslSearchParams
  ) => {
    assertValidTraceId(traceAccessor.traceId);
    const { index, field } = TRACE_SOURCE[source];
    const response = await traceAccessor.esClient.search<TDocument>({
      index,
      size,
      ...(sort ? { sort } : {}),
      query: {
        bool: {
          filter: [{ term: { [field]: traceAccessor.traceId } }, ...filter],
        },
      },
      _source: fields,
    });
    return response.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is TDocument => doc != null);
  },
});
