/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ServerEvaluator,
  ServerEvaluatorParams,
  ServerEvaluatorResult,
} from '../evaluator_registry';

interface ToolCall {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

/**
 * Extracts tool calls from the evaluator output. The output shape follows the
 * AdapterOutput convention from @kbn/evals-extensions: an object with an
 * optional `toolCalls` array of `{ toolName, args, result }`.
 */
const extractToolCalls = (output: unknown): ToolCall[] => {
  if (!output || typeof output !== 'object') return [];

  const obj = output as Record<string, unknown>;

  // Direct toolCalls array
  if (Array.isArray(obj.toolCalls)) {
    return obj.toolCalls as ToolCall[];
  }

  // Nested in metadata
  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (Array.isArray(meta.toolCalls)) {
      return meta.toolCalls as ToolCall[];
    }
  }

  return [];
};

/**
 * Detects consecutive calls to the same tool (tool loops).
 * 3+ consecutive = 0, 2 consecutive = 0.5, no repeats = 1.0
 */
const detectToolLoops = (toolCalls: ToolCall[]): number => {
  if (toolCalls.length <= 1) return 1.0;

  let maxConsecutive = 1;
  let current = 1;

  for (let i = 1; i < toolCalls.length; i++) {
    if (toolCalls[i].toolName === toolCalls[i - 1].toolName) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 1;
    }
  }

  if (maxConsecutive >= 3) return 0;
  if (maxConsecutive === 2) return 0.5;
  return 1.0;
};

/**
 * Detects retry patterns: same tool called again after a result containing
 * an error indicator. Score: 1.0 - (retryCount / totalCalls).
 */
const detectRetries = (toolCalls: ToolCall[]): number => {
  if (toolCalls.length <= 1) return 1.0;

  let retryCount = 0;

  for (let i = 1; i < toolCalls.length; i++) {
    const prev = toolCalls[i - 1];
    const curr = toolCalls[i];

    // Same tool called after the previous one errored
    if (curr.toolName === prev.toolName) {
      const hasError =
        prev.error != null ||
        (typeof prev.result === 'string' &&
          /\b(error|failed|exception|timeout)\b/i.test(prev.result));

      if (hasError) {
        retryCount++;
      }
    }
  }

  return 1.0 - retryCount / Math.max(toolCalls.length, 1);
};

/**
 * Detects response bloat by comparing output content length to input query length.
 * <=20x = 1.0 (optimal), <=50x = 0.5 (acceptable), >50x = 0.0 (bloated).
 */
const detectBloat = (input: Record<string, unknown>, output: unknown): number => {
  const queryStr = String(input.query ?? JSON.stringify(input));
  const inputLen = Math.max(queryStr.length, 1);

  let outputLen: number;
  if (typeof output === 'string') {
    outputLen = output.length;
  } else if (output && typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    outputLen =
      typeof obj.content === 'string' ? obj.content.length : JSON.stringify(output).length;
  } else {
    outputLen = 0;
  }

  const ratio = outputLen / inputLen;

  if (ratio <= 20) return 1.0;
  if (ratio <= 50) return 0.5;
  return 0.0;
};

/**
 * Agent efficiency CODE evaluator — detects tool loops, retries, and bloated
 * responses in Agent Builder skill outputs. No LLM calls required.
 *
 * Scoring weights:
 * - Tool loop detection: 0.4
 * - Retry detection: 0.3
 * - Response bloat detection: 0.3
 */
export const agentEfficiencyEvaluator: ServerEvaluator = {
  name: 'agent-efficiency',
  kind: 'CODE',
  description: 'Detects tool loops, retries, and bloated responses in agent outputs',
  source: 'prebuilt',
  evaluate: async (params: ServerEvaluatorParams): Promise<ServerEvaluatorResult> => {
    const toolCalls = extractToolCalls(params.output);
    const loopScore = detectToolLoops(toolCalls);
    const retryScore = detectRetries(toolCalls);
    const bloatScore = detectBloat(params.input, params.output);

    const weightedScore = loopScore * 0.4 + retryScore * 0.3 + bloatScore * 0.3;
    const label = weightedScore >= 0.7 ? 'pass' : weightedScore >= 0.4 ? 'warn' : 'fail';

    return {
      evaluator: 'agent-efficiency',
      kind: 'CODE',
      score: weightedScore,
      label,
      explanation: `Loop: ${loopScore.toFixed(2)}, Retry: ${retryScore.toFixed(
        2
      )}, Bloat: ${bloatScore.toFixed(2)}`,
      metadata: { loopScore, retryScore, bloatScore, toolCallCount: toolCalls.length },
    };
  },
};
