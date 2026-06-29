/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TraceAccessor } from '../types';

export interface TraceAccessorWithEsql extends TraceAccessor {
  runEsql(query: string): Promise<ESQLSearchResponse>;
}

const hasRequiredTraceFilter = ({ query, traceId }: { query: string; traceId: string }) => {
  const escapedTraceId = traceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const allowedPatterns = [
    new RegExp(`trace\\.id\\s*==\\s*"${escapedTraceId}"`),
    new RegExp(`trace_id\\s*==\\s*"${escapedTraceId}"`),
    new RegExp(`trace_id\\s*:\\s*"${escapedTraceId}"`),
  ];

  return allowedPatterns.some((pattern) => pattern.test(query));
};

export const createTraceAccessor = (traceAccessor: TraceAccessor): TraceAccessorWithEsql => {
  return {
    ...traceAccessor,
    runEsql: async (query: string) => {
      if (!hasRequiredTraceFilter({ query, traceId: traceAccessor.traceId })) {
        throw new Error(
          `Trace ES|QL query must include trace filter for traceId "${traceAccessor.traceId}"`
        );
      }

      return (await traceAccessor.esClient.esql.query({ query })) as ESQLSearchResponse;
    },
  };
};
