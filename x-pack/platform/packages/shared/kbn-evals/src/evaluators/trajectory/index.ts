/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '../../types';

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * How a called tool takes part in trajectory scoring:
 * - `scored`: counts toward order/coverage and the no-tools-expected guardrail.
 * - `runtime`: agent runtime scaffolding; dropped before scoring.
 * - `unclassified`: unknown tool; the trajectory is unmeasured (N/A) rather than scored.
 */
export type ToolCallClass = 'scored' | 'runtime' | 'unclassified';

export interface TrajectoryToolCall {
  id: string;
  /** Where the agent runtime sourced the tool from (Agent Builder `ToolOrigin`), when known. */
  origin?: string;
}

const UNCLASSIFIED_TOOL_LABEL_PREFIX = 'unclassified-tool:';

const toToolCall = (call: string | TrajectoryToolCall): TrajectoryToolCall =>
  typeof call === 'string' ? { id: call } : call;

const unique = (ids: string[]): string[] => [...new Set(ids)];

/**
 * Evaluates tool-call sequence alignment against a golden path using Longest Common
 * Subsequence (LCS) for order scoring and set intersection for coverage scoring.
 *
 * The final score is a weighted combination of order and coverage scores.
 * Both weights must sum to 1.
 *
 * @param config.extractToolCalls - Extracts actual tool calls (ids, optionally with origin) from task output
 * @param config.goldenPathExtractor - Extracts expected tool sequence from ground truth
 * @param config.orderWeight - Weight for LCS-based order score (default: 0.5)
 * @param config.coverageWeight - Weight for set-based coverage score (default: 0.5)
 * @param config.classifyTool - Classifies each non-golden call. Golden tools are always scored.
 *   Runtime calls are dropped; any unclassified call makes the result N/A with label
 *   `unclassified-tool:<ids>`. When omitted, every call is scored.
 */
export function createTrajectoryEvaluator(config: {
  extractToolCalls: (output: unknown) => Array<string | TrajectoryToolCall>;
  goldenPathExtractor: (expected: unknown) => string[];
  orderWeight?: number;
  coverageWeight?: number;
  classifyTool?: (call: TrajectoryToolCall) => ToolCallClass;
}): Evaluator {
  const {
    extractToolCalls,
    goldenPathExtractor,
    orderWeight = 0.5,
    coverageWeight = 0.5,
    classifyTool,
  } = config;

  if (Math.abs(orderWeight + coverageWeight - 1) > 1e-6) {
    throw new Error(
      `orderWeight (${orderWeight}) + coverageWeight (${coverageWeight}) must sum to 1`
    );
  }

  return {
    name: 'trajectory',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const calls = extractToolCalls(output).map(toToolCall);
      const golden = goldenPathExtractor(expected);
      const goldenSet = new Set(golden);

      const runtimeToolIds: string[] = [];
      const unclassifiedToolIds: string[] = [];
      const actual: string[] = [];
      for (const call of calls) {
        const toolClass = goldenSet.has(call.id) || !classifyTool ? 'scored' : classifyTool(call);
        if (toolClass === 'runtime') {
          runtimeToolIds.push(call.id);
        } else if (toolClass === 'unclassified') {
          unclassifiedToolIds.push(call.id);
        } else {
          actual.push(call.id);
        }
      }

      if (unclassifiedToolIds.length > 0) {
        const ids = unique(unclassifiedToolIds);
        return {
          score: null,
          label: 'N/A',
          explanation: `${UNCLASSIFIED_TOOL_LABEL_PREFIX}${ids.join(',')}`,
          metadata: { unclassifiedToolIds: ids, runtimeToolIds: unique(runtimeToolIds) },
        };
      }

      if (golden.length === 0) {
        return {
          score: actual.length === 0 ? 1.0 : 0.0,
          label: actual.length === 0 ? 'match' : 'unexpected-tools',
          explanation:
            actual.length === 0
              ? 'No tools expected and none called.'
              : `No tools expected but ${actual.length} were called: ${actual.join(', ')}`,
          ...(classifyTool && { metadata: { runtimeToolIds: unique(runtimeToolIds) } }),
        };
      }

      const lcs = computeLCS(actual, golden);
      const orderScore = lcs.length / Math.max(golden.length, 1);

      const matchedTools = actual.filter((tool) => goldenSet.has(tool));
      const uniqueMatched = new Set(matchedTools);
      const coverageScore = uniqueMatched.size / Math.max(goldenSet.size, 1);

      const score = orderWeight * orderScore + coverageWeight * coverageScore;

      const actualTools = new Set(actual);
      const missingTools = golden.filter((tool) => !actualTools.has(tool));
      const extraTools = actual.filter((tool) => !goldenSet.has(tool));

      const explanationParts = [
        `LCS length: ${lcs.length}/${golden.length}`,
        `Order score: ${orderScore.toFixed(2)}`,
        `Coverage: ${uniqueMatched.size}/${goldenSet.size} tools matched`,
        `Coverage score: ${coverageScore.toFixed(2)}`,
      ];
      if (missingTools.length > 0) {
        explanationParts.push(`Missing tools: ${missingTools.join(', ')}`);
      }
      if (extraTools.length > 0) {
        explanationParts.push(`Extra tools: ${extraTools.join(', ')}`);
      }

      return {
        score,
        label: score >= 0.8 ? 'good' : score >= 0.5 ? 'partial' : 'poor',
        explanation: explanationParts.join('. '),
        metadata: {
          lcsLength: lcs.length,
          orderScore,
          coverageScore,
          missingTools,
          extraTools,
          actual,
          expected: golden,
          ...(classifyTool && { runtimeToolIds: unique(runtimeToolIds) }),
        },
      };
    },
  };
}
