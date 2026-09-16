/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '../../types';
import { getToolCallSteps } from '../../utils/evaluation_helpers';

/**
 * Scores whether the agent reached its goal efficiently, by comparing the number
 * of tool calls it made against a maximum the dataset example declares.
 *
 * Domain-agnostic: the expectation is read via `maxToolCallsExtractor`, so any
 * suite can supply its own shape of ground truth.
 *
 * Scoring is a step penalty: at or under the limit scores 1, and each call beyond
 * it costs 0.2, floored at 0. Examples with no `maxToolCalls` (or a non-positive
 * one) are reported as `skipped`, so a missing expectation never reads as a pass
 * or a failure.
 *
 * @param config.maxToolCallsExtractor - Reads the expected call budget from an example
 * @param config.stepPenalty - Score lost per call over the budget (default: 0.2)
 */
export function createShortestPathEvaluator(config: {
  maxToolCallsExtractor: (expected: unknown) => number | undefined;
  stepPenalty?: number;
}): Evaluator {
  const { maxToolCallsExtractor, stepPenalty = 0.2 } = config;

  return {
    name: 'Shortest Path',
    kind: 'CODE' as const,
    evaluate: async ({ output, expected }) => {
      const maxToolCalls = maxToolCallsExtractor(expected);
      const actualToolCalls = getToolCallSteps(output as TaskOutput).length;

      if (!maxToolCalls || maxToolCalls <= 0) {
        return { score: 1, label: 'skipped', explanation: 'No maxToolCalls expectation set' };
      }

      const score =
        actualToolCalls <= maxToolCalls
          ? 1
          : Math.max(0, 1 - (actualToolCalls - maxToolCalls) * stepPenalty);

      return {
        score,
        label: actualToolCalls <= maxToolCalls ? 'within-budget' : 'over-budget',
        explanation: `${actualToolCalls} tool call(s) against a budget of ${maxToolCalls}`,
      };
    },
  };
}
