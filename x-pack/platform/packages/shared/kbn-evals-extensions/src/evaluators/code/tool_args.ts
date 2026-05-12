/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AdapterOutput, ToolCallRecord } from '../../types';

export interface ToolArgsConfig {
  /**
   * When true, only checks that expected keys exist with correct values,
   * ignoring extra keys in the actual args. Defaults to false.
   */
  allowExtraArgs?: boolean;
}

const compareValues = (actual: unknown, expected: unknown): boolean => {
  if (actual === expected) {
    return true;
  }
  if (typeof actual !== typeof expected) {
    return false;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return false;
    }
    return actual.every((v, i) => compareValues(v, expected[i]));
  }
  if (typeof actual === 'object' && actual !== null && expected !== null) {
    const actualObj = actual as Record<string, unknown>;
    const expectedObj = expected as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(actualObj), ...Object.keys(expectedObj)]);
    return [...allKeys].every((key) => compareValues(actualObj[key], expectedObj[key]));
  }
  return false;
};

const scoreToolCallArgs = (
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  allowExtraArgs: boolean
): { matched: number; total: number; mismatches: string[] } => {
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  const mismatches: string[] = [];

  let matched = 0;
  let total = expectedKeys.length;

  for (const key of expectedKeys) {
    if (key in actual && compareValues(actual[key], expected[key])) {
      matched++;
    } else {
      mismatches.push(key);
    }
  }

  if (!allowExtraArgs) {
    const extraKeys = actualKeys.filter((k) => !expectedKeys.includes(k));
    total += extraKeys.length;
    for (const key of extraKeys) {
      mismatches.push(`+${key}`);
    }
  }

  return { matched, total, mismatches };
};

/**
 * Validates that tool call arguments match expected argument structures.
 *
 * Compares actual tool call args against expected args provided in
 * `expected.toolArgs` — an array of `{ toolName, args }` objects.
 * Returns a score proportional to matching key-value pairs.
 */
export const createToolArgsEvaluator = (config?: ToolArgsConfig): Evaluator => ({
  name: 'tool-args',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const adapterOutput = output as Partial<AdapterOutput> | undefined;
    const toolCalls = adapterOutput?.toolCalls;

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No tool calls found in output',
      };
    }

    const expectedRecord = expected as Record<string, unknown> | undefined;
    const expectedToolArgs = expectedRecord?.toolArgs as
      | Array<{ toolName: string; args: Record<string, unknown> }>
      | undefined;

    if (!expectedToolArgs || !Array.isArray(expectedToolArgs) || expectedToolArgs.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No expected tool args specified for comparison',
      };
    }

    const allowExtraArgs = config?.allowExtraArgs ?? false;
    let totalMatched = 0;
    let totalKeys = 0;
    const perTool: Array<{
      toolName: string;
      matched: number;
      total: number;
      mismatches: string[];
    }> = [];

    const consumedIndices = new Set<number>();
    for (const expectedTool of expectedToolArgs) {
      const actualCallIndex = toolCalls.findIndex(
        (tc: ToolCallRecord, idx: number) =>
          tc.toolName === expectedTool.toolName && !consumedIndices.has(idx)
      );
      const actualCall = actualCallIndex >= 0 ? toolCalls[actualCallIndex] : undefined;
      if (actualCallIndex >= 0) consumedIndices.add(actualCallIndex);

      if (!actualCall) {
        const expectedKeyCount = Object.keys(expectedTool.args).length;
        totalKeys += expectedKeyCount;
        perTool.push({
          toolName: expectedTool.toolName,
          matched: 0,
          total: expectedKeyCount,
          mismatches: ['tool not called'],
        });
        continue;
      }

      const { matched, total, mismatches } = scoreToolCallArgs(
        actualCall.args,
        expectedTool.args,
        allowExtraArgs
      );
      totalMatched += matched;
      totalKeys += total;
      perTool.push({ toolName: expectedTool.toolName, matched, total, mismatches });
    }

    const score = totalKeys > 0 ? totalMatched / totalKeys : 1.0;
    const failedTools = perTool.filter((t) => t.mismatches.length > 0);

    const explanationParts: string[] = [`${totalMatched}/${totalKeys} arg keys matched`];
    if (failedTools.length > 0) {
      for (const t of failedTools) {
        explanationParts.push(`${t.toolName}: mismatches=[${t.mismatches.join(', ')}]`);
      }
    }

    return {
      score,
      label: score >= 0.8 ? 'pass' : score >= 0.5 ? 'warn' : 'fail',
      explanation: explanationParts.join('; '),
      metadata: { perTool, totalMatched, totalKeys },
    };
  },
});
