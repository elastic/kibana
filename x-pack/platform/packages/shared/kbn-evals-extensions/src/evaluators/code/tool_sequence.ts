/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AdapterOutput } from '../../types';

/**
 * Computes the length of the Longest Common Subsequence between two arrays.
 */
const lcsLength = (a: string[], b: string[]): number => {
  const m = a.length;
  const n = b.length;

  // Use two rows instead of full matrix for space efficiency
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
};

/**
 * Evaluates tool call sequence correctness using Longest Common Subsequence.
 *
 * Compares the ordered sequence of tool names actually called against
 * an expected sequence in `expected.toolSequence` (string[]).
 * Returns LCS length / expected length as the score.
 */
export const createToolSequenceEvaluator = (): Evaluator => ({
  name: 'tool-sequence',
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
    const expectedSequence = expectedRecord?.toolSequence as string[] | undefined;

    if (!expectedSequence || !Array.isArray(expectedSequence) || expectedSequence.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No expected tool sequence specified for comparison',
      };
    }

    const actualSequence = toolCalls.map((tc) => tc.toolName);
    const lcs = lcsLength(actualSequence, expectedSequence);
    const score = lcs / expectedSequence.length;

    const explanationParts: string[] = [
      `LCS=${lcs}/${expectedSequence.length}`,
      `actual=[${actualSequence.join(', ')}]`,
      `expected=[${expectedSequence.join(', ')}]`,
    ];

    return {
      score,
      label: score >= 0.8 ? 'pass' : score >= 0.5 ? 'warn' : 'fail',
      explanation: explanationParts.join(', '),
      metadata: {
        lcsLength: lcs,
        expectedLength: expectedSequence.length,
        actualLength: actualSequence.length,
        actualSequence,
        expectedSequence,
      },
    };
  },
});
