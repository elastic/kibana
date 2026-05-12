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

export function createSpanLatencyEvaluator({
  traceEsClient,
  log,
  spanName,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  spanName: string;
}): Evaluator {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: 'Latency',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}" AND name == "${spanName}"
| EVAL latency_seconds = TO_DOUBLE(duration) / 1000000000
| KEEP latency_seconds`,
      extractResult: (response) => {
        return response.values[0][0];
      },
    },
  });
}
