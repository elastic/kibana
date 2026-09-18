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
 * Fraction of the observed calls that the golden path accounts for:
 * `golden.length / max(actual.length, golden.length)`. 1 when the actual sequence is no
 * longer than the golden path (missing calls are already penalised by order/coverage),
 * and strictly below 1 when the agent made extra or duplicate calls.
 */
function extraCallPrecision(actual: string[], golden: string[]): number {
  return golden.length / Math.max(actual.length, golden.length, 1);
}

/**
 * Calls an agent made more often than the golden path prescribes. Duplicates are invisible
 * to set-based coverage (`extraTools` only holds tools the golden path never mentions), so
 * they are reported separately.
 */
function findDuplicateTools(actual: string[], golden: string[]): string[] {
  const goldenCounts = new Map<string, number>();
  for (const tool of golden) {
    goldenCounts.set(tool, (goldenCounts.get(tool) ?? 0) + 1);
  }

  const actualCounts = new Map<string, number>();
  for (const tool of actual) {
    actualCounts.set(tool, (actualCounts.get(tool) ?? 0) + 1);
  }

  return [...actualCounts.entries()]
    .filter(([tool, count]) => count > (goldenCounts.get(tool) ?? 0))
    .map(([tool]) => tool);
}

/**
 * Evaluates tool-call sequence alignment against a golden path using Longest Common
 * Subsequence (LCS) for order scoring and set intersection for coverage scoring.
 *
 * The final score is a weighted combination of order and coverage scores.
 * Both weights must sum to 1.
 *
 * With `penalizeExtraCalls`, both of those terms are divided by the golden path alone,
 * so a single expected call is matched perfectly by any actual sequence that contains
 * it — including redundant or unrelated calls. The penalty closes that gap by scaling
 * the weighted score with the golden/actual length ratio; leave it off when extra calls
 * are legitimately acceptable for the suite.
 *
 * @param config.extractToolCalls - Extracts actual tool call names from task output
 * @param config.goldenPathExtractor - Extracts expected tool sequence from ground truth
 * @param config.orderWeight - Weight for LCS-based order score (default: 0.5)
 * @param config.coverageWeight - Weight for set-based coverage score (default: 0.5)
 * @param config.penalizeExtraCalls - Scale the score down by extra/duplicate calls
 *   (default: false). See {@link extraCallPrecision}.
 */
export function createTrajectoryEvaluator(config: {
  extractToolCalls: (output: unknown) => string[];
  goldenPathExtractor: (expected: unknown) => string[];
  orderWeight?: number;
  coverageWeight?: number;
  penalizeExtraCalls?: boolean;
}): Evaluator {
  const {
    extractToolCalls,
    goldenPathExtractor,
    orderWeight = 0.5,
    coverageWeight = 0.5,
    penalizeExtraCalls = false,
  } = config;

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

      const weightedScore = orderWeight * orderScore + coverageWeight * coverageScore;

      const precision = penalizeExtraCalls ? extraCallPrecision(actual, golden) : 1;
      const score = weightedScore * precision;

      const actualTools = new Set(actual);
      const missingTools = golden.filter((tool) => !actualTools.has(tool));
      const extraTools = actual.filter((tool) => !goldenSet.has(tool));
      const duplicateTools = findDuplicateTools(actual, golden);
      const exactSequence =
        actual.length === golden.length && actual.every((tool, index) => tool === golden[index]);

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
      if (duplicateTools.length > 0) {
        explanationParts.push(`Duplicate tools: ${duplicateTools.join(', ')}`);
      }
      if (penalizeExtraCalls) {
        explanationParts.push(
          `Precision: ${precision.toFixed(2)} (score scaled by golden/actual length ratio)`
        );
      }

      // Extra/duplicate calls get their own label so a scaled score is not read as a
      // "good" or "partial" match in the report.
      const hasExtraOrDuplicateCalls = penalizeExtraCalls && !exactSequence && precision < 1;
      const label = hasExtraOrDuplicateCalls
        ? 'extra-or-duplicate-tools'
        : score >= 0.8
        ? 'good'
        : score >= 0.5
        ? 'partial'
        : 'poor';

      return {
        score,
        label,
        explanation: explanationParts.join('. '),
        metadata: {
          lcsLength: lcs.length,
          orderScore,
          coverageScore,
          precision,
          exactSequence,
          missingTools,
          extraTools,
          duplicateTools,
          actual,
          expected: golden,
        },
      };
    },
  };
}
