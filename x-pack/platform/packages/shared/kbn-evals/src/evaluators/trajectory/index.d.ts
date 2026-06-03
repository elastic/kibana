import type { Evaluator } from '../../types';
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
export declare function createTrajectoryEvaluator(config: {
    extractToolCalls: (output: unknown) => string[];
    goldenPathExtractor: (expected: unknown) => string[];
    orderWeight?: number;
    coverageWeight?: number;
}): Evaluator;
