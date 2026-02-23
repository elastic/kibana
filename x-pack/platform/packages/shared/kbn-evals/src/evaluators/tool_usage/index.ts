/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '../../types';
import {
  AUXILIARY_DISCOVERY_TOOLS,
  getStringMeta,
  getToolCallStepsWithParams,
} from '../../utils/evaluation_helpers';

/** Acceptable general-purpose tools that can substitute for a specialized tool. */
const ACCEPTABLE_ALTERNATIVES = new Set([
  'platform.core.search',
  'platform.core.execute_esql',
]);

/**
 * Check whether an invoke_skill call matches the expected tool identifier.
 */
const invokeSkillMatchesExpected = (
  toolCall: { tool_id?: string; params?: Record<string, unknown> },
  expectedOnlyToolId: string
): boolean => {
  if (toolCall.tool_id !== 'invoke_skill') return false;

  const params = toolCall.params as
    | { name?: string; operation?: string; params?: { operation?: string } }
    | undefined;
  if (!params?.name) return false;

  const operation = params.operation || params.params?.operation;
  const expectedToolName = expectedOnlyToolId.split('.').pop() || '';
  const expectedNamespace = expectedOnlyToolId.replace('.core.', '.');

  if (params.name === expectedNamespace || params.name === expectedOnlyToolId) {
    return true;
  }

  if (params.name === 'platform.search') {
    if (expectedToolName === 'search' && (!operation || operation === 'search')) {
      return true;
    }
    if (expectedToolName === 'execute_esql' && operation === 'execute_esql') {
      return true;
    }
  }

  return false;
};

/**
 * Evaluator that checks whether the agent used the expected tool.
 *
 * If the example metadata contains `expectedOnlyToolId`, the evaluator verifies
 * the agent called that tool directly, via `invoke_skill`, or used an acceptable
 * general-purpose alternative. Returns score 1 when no expectation is set.
 */
export const createToolUsageOnlyEvaluator = (): Evaluator => ({
  name: 'ToolUsageOnly',
  kind: 'CODE' as const,
  evaluate: async ({ output, metadata }) => {
    const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
    if (!expectedOnlyToolId) return { score: 1 };

    const toolCalls = getToolCallStepsWithParams(output as TaskOutput);
    if (toolCalls.length === 0) {
      return { score: 0, metadata: { reason: 'No tool calls found', expectedOnlyToolId } };
    }

    const meaningfulToolCalls = toolCalls.filter(
      (t) => !AUXILIARY_DISCOVERY_TOOLS.has(t.tool_id || '')
    );

    if (meaningfulToolCalls.length === 0) {
      return {
        score: 0,
        metadata: { reason: 'Only auxiliary discovery tools found', expectedOnlyToolId },
      };
    }

    const usedToolIds = meaningfulToolCalls.map((t) => t.tool_id).filter(Boolean);
    const hasExpectedDirect = usedToolIds.includes(expectedOnlyToolId);
    const hasExpectedViaInvokeSkill = meaningfulToolCalls.some((tc) =>
      invokeSkillMatchesExpected(tc, expectedOnlyToolId)
    );
    const hasAcceptableAlternative = usedToolIds.some((id) =>
      ACCEPTABLE_ALTERNATIVES.has(id as string)
    );
    const hasExpected =
      hasExpectedDirect || hasExpectedViaInvokeSkill || hasAcceptableAlternative;

    const invokeSkillCalls = meaningfulToolCalls
      .filter((t) => t.tool_id === 'invoke_skill')
      .map((t) => ({
        name: (t.params as { name?: string })?.name,
        operation: (t.params as { operation?: string })?.operation,
        nestedOp: (t.params as { params?: { operation?: string } })?.params?.operation,
      }));

    return {
      score: hasExpected ? 1 : 0,
      metadata: {
        expectedOnlyToolId,
        usedToolIds,
        hasExpectedDirect,
        hasExpectedViaInvokeSkill,
        hasAcceptableAlternative,
        invokeSkillCalls,
      },
    };
  },
});
