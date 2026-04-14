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
 * Evaluates tool-call sequence alignment against a golden path using Longest Common
 * Subsequence (LCS) for order scoring and set intersection for coverage scoring.
 *
 * The final score is a weighted combination of order and coverage scores.
 * Both weights must sum to 1.
 *
 * @param config.extractToolCalls - Extracts actual tool call names from task output
 * @param config.goldenPathExtractor - Extracts expected tool sequence from ground truth
 * @param config.orderWeight - Weight for LCS-based order score (default: 0.5)
 * @param config.coverageWeight - Weight for set-based coverage score (default: 0.5)
 */
export function createTrajectoryEvaluator(config: {
  extractToolCalls: (output: unknown) => string[];
  goldenPathExtractor: (expected: unknown) => string[];
  orderWeight?: number;
  coverageWeight?: number;
}): Evaluator {
  const { extractToolCalls, goldenPathExtractor, orderWeight = 0.5, coverageWeight = 0.5 } = config;

  if (Math.abs(orderWeight + coverageWeight - 1) > 1e-6) {
    throw new Error(
      `orderWeight (${orderWeight}) + coverageWeight (${coverageWeight}) must sum to 1`
    );
  }

  return {
    name: 'trajectory',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const actual = extractToolCalls(output);
      const golden = goldenPathExtractor(expected);

      if (golden.length === 0) {
        return {
          score: actual.length === 0 ? 1.0 : 0.0,
          label: actual.length === 0 ? 'match' : 'unexpected-tools',
          explanation:
            actual.length === 0
              ? 'No tools expected and none called.'
              : `No tools expected but ${actual.length} were called: ${actual.join(', ')}`,
        };
      }

      const lcs = computeLCS(actual, golden);
      const orderScore = lcs.length / Math.max(golden.length, 1);

      const goldenSet = new Set(golden);
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
        },
      };
    },
  };
}
