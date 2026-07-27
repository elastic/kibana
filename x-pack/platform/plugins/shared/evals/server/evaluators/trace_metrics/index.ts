/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorDefinition, EvaluatorResult } from '../types';
import { createTraceAccessor } from '../trace_accessor';

const getTraceMetricResult = async ({
  evaluatorName,
  traceId,
  resolveMetricValue,
  log,
}: {
  evaluatorName: string;
  traceId: string;
  resolveMetricValue: () => Promise<number | null | undefined>;
  log: Parameters<EvaluatorDefinition['evaluate']>[0]['log'];
}): Promise<EvaluatorResult> => {
  try {
    const metricValue = await resolveMetricValue();
    if (metricValue == null || !Number.isFinite(metricValue)) {
      throw new Error(
        `Metric value is not numeric for evaluator "${evaluatorName}" and trace "${traceId}"`
      );
    }

    return {
      scores: [
        {
          name: evaluatorName,
          score: metricValue,
        },
      ],
    };
  } catch (error) {
    log.warn(
      `Returning unavailable for evaluator "${evaluatorName}" on trace "${traceId}" due to missing/incomplete trace metrics`
    );
    log.debug(error);
    return {
      scores: [
        {
          name: evaluatorName,
          label: 'unavailable',
        },
      ],
    };
  }
};

export const latencyEvaluatorDef: EvaluatorDefinition = {
  name: 'latency',
  version: '1.0.0',
  kind: 'code',
  description: 'Returns total trace latency in seconds.',
  async evaluate({ trace, log }) {
    const accessor = createTraceAccessor(trace);

    return getTraceMetricResult({
      evaluatorName: 'latency',
      traceId: accessor.traceId,
      resolveMetricValue: async () => {
        const { aggregations } = await accessor.runSearch<{
          total_duration_ns?: { value?: number | null };
        }>('traces', {
          size: 0,
          aggs: {
            total_duration_ns: {
              max: {
                field: 'duration',
              },
            },
          },
        });

        const totalDurationNs = aggregations?.total_duration_ns?.value;
        return totalDurationNs == null ? totalDurationNs : totalDurationNs / 1_000_000_000;
      },
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

    return getTraceMetricResult({
      evaluatorName: 'input_tokens',
      traceId: accessor.traceId,
      resolveMetricValue: async () => {
        const { aggregations } = await accessor.runSearch<{
          input_tokens?: { value?: number | null };
        }>('traces', {
          size: 0,
          aggs: {
            input_tokens: {
              sum: {
                field: 'attributes.gen_ai.usage.input_tokens',
              },
            },
          },
        });

        return aggregations?.input_tokens?.value;
      },
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

    return getTraceMetricResult({
      evaluatorName: 'output_tokens',
      traceId: accessor.traceId,
      resolveMetricValue: async () => {
        const { aggregations } = await accessor.runSearch<{
          output_tokens?: { value?: number | null };
        }>('traces', {
          size: 0,
          aggs: {
            output_tokens: {
              sum: {
                field: 'attributes.gen_ai.usage.output_tokens',
              },
            },
          },
        });

        return aggregations?.output_tokens?.value;
      },
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

    return getTraceMetricResult({
      evaluatorName: 'tool_calls',
      traceId: accessor.traceId,
      resolveMetricValue: async () => {
        const { aggregations } = await accessor.runSearch<{
          tool_calls?: { doc_count?: number };
        }>('traces', {
          size: 0,
          aggs: {
            tool_calls: {
              filter: {
                term: {
                  'attributes.elastic.inference.span.kind': 'TOOL',
                },
              },
            },
          },
        });

        return aggregations?.tool_calls?.doc_count;
      },
      log,
    });
  },
};
