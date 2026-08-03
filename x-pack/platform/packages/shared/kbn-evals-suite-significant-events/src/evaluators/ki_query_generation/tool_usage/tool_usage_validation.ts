/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';

interface ToolUsageTaskOutput {
  toolUsage?: SignificantEventsToolUsage;
}

/**
 * Validates that the `get_stream_features` and `add_queries` tools were
 * invoked correctly during significant event generation.
 */
export const createToolUsageEvaluator = (): Evaluator => ({
  name: 'tool_usage_validation',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const toolUsage = (output as ToolUsageTaskOutput)?.toolUsage;

    if (!toolUsage) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No toolUsage data returned from task',
      };
    }

    const scores: number[] = [];
    const issues: string[] = [];

    if (toolUsage.get_stream_features.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('get_stream_features was never called');
    }

    if (toolUsage.add_queries.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('add_queries was never called');
    }

    const totalCalls = toolUsage.get_stream_features.calls + toolUsage.add_queries.calls;
    const totalFailures = toolUsage.get_stream_features.failures + toolUsage.add_queries.failures;

    if (totalCalls > 0) {
      const successRate = 1 - totalFailures / totalCalls;
      scores.push(successRate);
      if (totalFailures > 0) {
        issues.push(`${totalFailures}/${totalCalls} tool calls failed`);
      }
    }

    const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      score,
      explanation:
        issues.length > 0
          ? issues.join('; ')
          : `All tool calls succeeded (get_stream_features: ${toolUsage.get_stream_features.calls}, add_queries: ${toolUsage.add_queries.calls})`,
      details: {
        get_stream_features: toolUsage.get_stream_features,
        add_queries: toolUsage.add_queries,
      },
    };
  },
});
