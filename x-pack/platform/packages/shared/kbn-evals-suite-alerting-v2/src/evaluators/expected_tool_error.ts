/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import type { RuleManagementExample } from '../types';
import { getToolCallSteps, skippedResult } from '../evaluator_utils';

interface ToolResult {
  type?: string;
  data?: {
    message?: string;
    metadata?: Record<string, unknown>;
  };
}

const isToolResult = (value: unknown): value is ToolResult =>
  typeof value === 'object' && value !== null && 'type' in value;

/**
 * Deterministic evaluator that inspects tool call results for a specific error
 * pattern. Use to verify that a tool returned an error containing the expected
 * substring (e.g. a missing privilege name) rather than relying on LLM criteria
 * to judge the assistant's text response.
 */
export const createExpectedToolErrorEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedToolError',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectation = expected?.expectedToolError;
    if (expectation == null) {
      return skippedResult('No tool-error expectation for this example');
    }

    const { toolId, messageContains } = expectation;
    const steps = getToolCallSteps(output);

    const matchingSteps = steps.filter((step) => step.tool_id === toolId);
    if (matchingSteps.length === 0) {
      return {
        score: 0,
        explanation: `Tool "${toolId}" was never called`,
        metadata: { toolId, usedToolIds: steps.map((s) => s.tool_id) },
      };
    }

    const errorResults = matchingSteps.flatMap((step) =>
      (step.results ?? []).filter(isToolResult).filter((r) => r.type === 'error')
    );

    if (errorResults.length === 0) {
      return {
        score: 0,
        explanation: `Tool "${toolId}" was called but returned no error results`,
        metadata: { toolId, stepCount: matchingSteps.length },
      };
    }

    const matchingError = errorResults.find((r) =>
      r.data?.message?.includes(messageContains)
    );

    return {
      score: matchingError ? 1 : 0,
      explanation: matchingError
        ? undefined
        : `Tool "${toolId}" returned error(s) but none contained "${messageContains}"`,
      metadata: {
        toolId,
        messageContains,
        errorMessages: errorResults.map((r) => r.data?.message),
      },
    };
  },
});
