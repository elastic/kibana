/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
import { createTraceBasedEvaluator } from './factory';

export function createLatencyEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: 'Latency',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS total_duration_ns = MAX(duration)
| EVAL latency_seconds = TO_DOUBLE(total_duration_ns) / 1000000000
| KEEP latency_seconds`,
      extractResult: (response) => {
        return response.values[0][0];
      },
    },
  });
}

type SpanLatencyFilter =
  | { spanName: string; operationName?: undefined }
  | { operationName: string; spanName?: undefined };

export function createSpanLatencyEvaluator({
  traceEsClient,
  log,
  spanName,
  operationName,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
} & SpanLatencyFilter): Evaluator {
  const spanFilter = spanName
    ? `name == "${spanName}"`
    : `attributes.gen_ai.operation.name == "${operationName}"`;

  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: 'Latency',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}" AND ${spanFilter}
| STATS total_duration_ns = SUM(duration)
| EVAL latency_seconds = TO_DOUBLE(total_duration_ns) / 1000000000
| KEEP latency_seconds`,
      extractResult: (response) => {
        return response.values[0][0];
      },
    },
  });
}
