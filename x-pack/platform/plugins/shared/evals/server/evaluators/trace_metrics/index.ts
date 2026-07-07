/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorDefinition, EvaluatorResult } from '../types';
import { createTraceAccessor } from '../trace_accessor';
import type { TraceSource } from '../trace_accessor';
import { rowsFromEsqlResponse } from '../esql_utils';

/**
 * Trace spans are exported asynchronously (batched), so a trace produced moments
 * ago by the task may not be queryable the instant we grade it. Retry a few times
 * with exponential backoff before giving up, mirroring the offline runner's
 * trace-based evaluators.
 */
export const TRACE_METRIC_RETRY = { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 8000 } as const;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Signals the trace is not queryable yet (empty/incomplete), so retrying may help. */
class TraceNotReadyError extends Error {}

const getTraceMetricResult = async ({
  evaluatorName,
  traceId,
  runEsql,
  source,
  pipeline,
  columnName,
  log,
}: {
  evaluatorName: string;
  traceId: string;
  runEsql: (
    s: TraceSource,
    p: string
  ) => ReturnType<ReturnType<typeof createTraceAccessor>['runEsql']>;
  source: TraceSource;
  pipeline: string;
  columnName: string;
  log: Parameters<EvaluatorDefinition['evaluate']>[0]['log'];
}): Promise<EvaluatorResult> => {
  const fetchMetric = async (): Promise<number> => {
    const response = await runEsql(source, pipeline);
    const rows = rowsFromEsqlResponse<Record<string, number | null>>(response);
    const firstRow = rows[0];
    if (!firstRow) {
      throw new TraceNotReadyError(
        `No trace metric rows returned for evaluator "${evaluatorName}" and trace "${traceId}"`
      );
    }

    const metricValue = firstRow[columnName];
    if (metricValue == null || !Number.isFinite(metricValue)) {
      throw new TraceNotReadyError(
        `Metric "${columnName}" is not numeric for evaluator "${evaluatorName}" and trace "${traceId}"`
      );
    }

    return metricValue;
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= TRACE_METRIC_RETRY.maxAttempts; attempt++) {
    try {
      const metricValue = await fetchMetric();
      return { scores: [{ name: evaluatorName, score: metricValue }] };
    } catch (error) {
      lastError = error;
      // Only the "trace not ready yet" case benefits from a retry; a genuine
      // query error will just fail again, so bail out immediately for those.
      const canRetry =
        error instanceof TraceNotReadyError && attempt < TRACE_METRIC_RETRY.maxAttempts;
      if (!canRetry) {
        break;
      }
      const delayMs = Math.min(
        TRACE_METRIC_RETRY.baseDelayMs * 2 ** (attempt - 1),
        TRACE_METRIC_RETRY.maxDelayMs
      );
      log.debug(
        `Trace "${traceId}" not ready for evaluator "${evaluatorName}" (attempt ${attempt}); retrying in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }

  log.warn(
    `Returning unavailable for evaluator "${evaluatorName}" on trace "${traceId}" due to missing/incomplete trace metrics`
  );
  log.debug(lastError instanceof Error ? lastError.message : String(lastError));
  return {
    scores: [
      {
        name: evaluatorName,
        label: 'unavailable',
      },
    ],
  };
};

export const latencyEvaluatorDef: EvaluatorDefinition = {
  name: 'latency',
  version: '1.0.0',
  kind: 'code',
  description: 'Returns total trace latency in seconds.',
  async evaluate({ trace, log }) {
    const accessor = createTraceAccessor(trace);
    const pipeline = `| STATS total_duration_ns = MAX(duration)
| EVAL latency_seconds = TO_DOUBLE(total_duration_ns) / 1000000000
| KEEP latency_seconds`;

    return getTraceMetricResult({
      evaluatorName: 'latency',
      traceId: accessor.traceId,
      runEsql: accessor.runEsql,
      source: 'traces',
      pipeline,
      columnName: 'latency_seconds',
      log,
    });
  },
};

export const inputTokensEvaluatorDef: EvaluatorDefinition = {
  name: 'input_tokens',
  version: '1.0.0',
  kind: 'code',
  description: 'Returns summed prompt/input token usage across the trace.',
  async evaluate({ trace, log }) {
    const accessor = createTraceAccessor(trace);
    const pipeline = `| STATS input_tokens = SUM(attributes.gen_ai.usage.input_tokens)
| KEEP input_tokens`;

    return getTraceMetricResult({
      evaluatorName: 'input_tokens',
      traceId: accessor.traceId,
      runEsql: accessor.runEsql,
      source: 'traces',
      pipeline,
      columnName: 'input_tokens',
      log,
    });
  },
};

export const outputTokensEvaluatorDef: EvaluatorDefinition = {
  name: 'output_tokens',
  version: '1.0.0',
  kind: 'code',
  description: 'Returns summed completion/output token usage across the trace.',
  async evaluate({ trace, log }) {
    const accessor = createTraceAccessor(trace);
    const pipeline = `| STATS output_tokens = SUM(attributes.gen_ai.usage.output_tokens)
| KEEP output_tokens`;

    return getTraceMetricResult({
      evaluatorName: 'output_tokens',
      traceId: accessor.traceId,
      runEsql: accessor.runEsql,
      source: 'traces',
      pipeline,
      columnName: 'output_tokens',
      log,
    });
  },
};

export const toolCallsEvaluatorDef: EvaluatorDefinition = {
  name: 'tool_calls',
  version: '1.0.0',
  kind: 'code',
  description: 'Returns count of TOOL spans associated with the trace.',
  async evaluate({ trace, log }) {
    const accessor = createTraceAccessor(trace);
    const pipeline = `| WHERE attributes.elastic.inference.span.kind == "TOOL"
| STATS tool_call_count = COUNT(*)
| KEEP tool_call_count`;

    return getTraceMetricResult({
      evaluatorName: 'tool_calls',
      traceId: accessor.traceId,
      runEsql: accessor.runEsql,
      source: 'traces',
      pipeline,
      columnName: 'tool_call_count',
      log,
    });
  },
};
