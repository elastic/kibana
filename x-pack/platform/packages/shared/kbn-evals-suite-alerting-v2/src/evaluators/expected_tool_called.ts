/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator, type TaskOutput } from '@kbn/evals';
import type { RuleManagementExample } from '../types';
import { skippedResult } from '../evaluator_utils';

export const getUsedToolIds = (output: TaskOutput): string[] =>
  getToolCallSteps(output)
    .map((toolCall) => toolCall.tool_id)
    .filter((toolId): toolId is string => Boolean(toolId));

const requireNonEmptyStringList = (value: unknown, fieldName: string): readonly string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be a non-empty array of tool-ids`);
  }
  const ids = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (ids.length === 0) {
    throw new Error(`${fieldName} must contain at least one tool-id`);
  }
  return ids;
};

export const createExpectedToolCalledEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectedToolIds = expected?.expectedToolIds;

    if (expectedToolIds == null) {
      return skippedResult('No tool-call expectation for this example');
    }

    const requiredToolIds = requireNonEmptyStringList(expectedToolIds, 'expectedToolIds');
    const usedToolIds = getUsedToolIds(output as TaskOutput);
    const missingToolIds = requiredToolIds.filter((id) => !usedToolIds.includes(id));

    return {
      score: missingToolIds.length === 0 ? 1 : 0,
      metadata: { expectedToolIds: requiredToolIds, usedToolIds, missingToolIds },
    };
  },
});

export const createExpectedAnyOfToolIdsEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedAnyOfToolIds',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectedAnyOfToolIds = expected?.expectedAnyOfToolIds;

    if (expectedAnyOfToolIds == null) {
      return skippedResult('No any-of tool-id expectation for this example');
    }

    const alternatives = requireNonEmptyStringList(expectedAnyOfToolIds, 'expectedAnyOfToolIds');
    const usedToolIds = getUsedToolIds(output as TaskOutput);
    const matchedToolIds = alternatives.filter((id) => usedToolIds.includes(id));

    return {
      score: matchedToolIds.length > 0 ? 1 : 0,
      metadata: { expectedAnyOfToolIds: alternatives, matchedToolIds, usedToolIds },
    };
  },
});
