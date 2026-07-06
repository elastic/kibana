/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isValidTraceId } from '@opentelemetry/api';
import { LOGS_INDEX_PATTERN, TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import type { TraceAccessor } from './types';

const TRACE_SOURCE = {
  traces: { index: TRACES_INDEX_PATTERN, field: 'trace.id' },
  logs: { index: LOGS_INDEX_PATTERN, field: 'trace_id' },
} as const;

export type TraceSource = keyof typeof TRACE_SOURCE;

export interface TraceAccessorWithEsql extends TraceAccessor {
  runEsql(source: TraceSource, pipeline: string): Promise<ESQLSearchResponse>;
}

export const createTraceAccessor = (traceAccessor: TraceAccessor): TraceAccessorWithEsql => ({
  ...traceAccessor,
  runEsql: async (source: TraceSource, pipeline: string) => {
    if (!isValidTraceId(traceAccessor.traceId)) {
      throw new Error('Invalid trace_id: must be a 32-character hex string');
    }
    const { index, field } = TRACE_SOURCE[source];
    const query = `FROM ${index}\n| WHERE ${field} == ?trace_id\n${pipeline}`;
    const params = [{ trace_id: traceAccessor.traceId }] as unknown as FieldValue[];
    return (await traceAccessor.esClient.esql.query({ query, params })) as ESQLSearchResponse;
  },
});
