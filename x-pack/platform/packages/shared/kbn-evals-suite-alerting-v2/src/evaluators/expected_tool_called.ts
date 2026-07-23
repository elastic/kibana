/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator, type TaskOutput } from '@kbn/evals';
import type { RuleManagementExample } from '../evaluate_dataset';

export const getUsedToolIds = (output: TaskOutput): string[] =>
  getToolCallSteps(output)
    .map((toolCall) => toolCall.tool_id)
    .filter((toolId): toolId is string => Boolean(toolId));

export const createExpectedToolCalledEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedToolIds = metadata?.expectedToolIds;

    if (expectedToolIds == null) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No tool-call expectation for this example',
      };
    }

    if (expectedToolIds.length === 0) {
      throw new Error('expectedToolIds must contain at least one tool-id');
    }

    const usedToolIds = getUsedToolIds(output as TaskOutput);
    const missingToolIds = expectedToolIds.filter((id) => !usedToolIds.includes(id));

    return {
      score: missingToolIds.length === 0 ? 1 : 0,
      metadata: { expectedToolIds, usedToolIds, missingToolIds },
    };
  },
});

export const createExpectedAnyOfToolIdsEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedAnyOfToolIds',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedAnyOfToolIds = metadata?.expectedAnyOfToolIds;

    if (expectedAnyOfToolIds == null) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No any-of tool-id expectation for this example',
      };
    }

    if (expectedAnyOfToolIds.length === 0) {
      throw new Error('expectedAnyOfToolIds must contain at least one tool-id');
    }

    const usedToolIds = getUsedToolIds(output as TaskOutput);
    const matchedToolIds = expectedAnyOfToolIds.filter((id) => usedToolIds.includes(id));

    return {
      score: matchedToolIds.length > 0 ? 1 : 0,
      metadata: { expectedAnyOfToolIds, matchedToolIds, usedToolIds },
    };
  },
});
