/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStringMeta, getToolCallSteps, type Evaluator, type TaskOutput } from '@kbn/evals';

/**
 * CODE evaluator that checks tool-call routing for a single example.
 *
 * Reads expectations from the example metadata:
 * - `expectedToolId`: the conversation must call this tool at least once.
 * - `forbiddenToolId`: the conversation must NOT call this tool.
 *
 * When neither is set the example has no routing expectation and scores 1 (n/a).
 */
export const createExpectedToolCalledEvaluator = (): Evaluator => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedToolId = getStringMeta(metadata, 'expectedToolId');
    const forbiddenToolId = getStringMeta(metadata, 'forbiddenToolId');

    if (!expectedToolId && !forbiddenToolId) {
      return { score: 1, metadata: { reason: 'No tool-call expectation for this example' } };
    }

    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((toolCall) => toolCall.tool_id)
      .filter((toolId): toolId is string => Boolean(toolId));

    const checks: boolean[] = [];
    if (expectedToolId) {
      checks.push(usedToolIds.includes(expectedToolId));
    }
    if (forbiddenToolId) {
      checks.push(!usedToolIds.includes(forbiddenToolId));
    }

    const passed = checks.every(Boolean);

    return {
      score: passed ? 1 : 0,
      metadata: { expectedToolId, forbiddenToolId, usedToolIds },
    };
  },
});
