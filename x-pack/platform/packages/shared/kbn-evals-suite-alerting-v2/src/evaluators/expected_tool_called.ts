/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import type { RuleManagementExample } from '../types';
import { getToolCallSteps, requireNonEmptyStringList, skippedResult } from '../evaluator_utils';

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
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const requiredToolIds = requireNonEmptyStringList(
      expected?.expectedToolIds,
      'expectedToolIds',
      'tool-ids'
    );
    if (requiredToolIds.length === 0) {
      return skippedResult('No tool-call expectation for this example');
    }

    const usedToolIds = getUsedToolIds(output);
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
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const alternatives = requireNonEmptyStringList(
      expected?.expectedAnyOfToolIds,
      'expectedAnyOfToolIds',
      'tool-ids'
    );
    if (alternatives.length === 0) {
      return skippedResult('No any-of tool-id expectation for this example');
    }

    const usedToolIds = getUsedToolIds(output);
    const matchedToolIds = alternatives.filter((id) => usedToolIds.includes(id));

    return {
      score: matchedToolIds.length > 0 ? 1 : 0,
      metadata: { expectedAnyOfToolIds: alternatives, matchedToolIds, usedToolIds },
    };
  },
});
