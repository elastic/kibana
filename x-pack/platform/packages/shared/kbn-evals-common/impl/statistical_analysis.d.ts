import type { EvaluationScoreDocument } from './schemas/common_attributes.gen';
import type { PairedTTestResult } from './schemas/runs/compare_runs_route.gen';
export interface PairedScore {
    datasetId: string;
    datasetName: string;
    evaluatorName: string;
    scoreA: number;
    scoreB: number;
}
/**
 * Pair scores by dataset, example, evaluator, and repetition index.
 */
export declare function pairScores(scoresA: EvaluationScoreDocument[], scoresB: EvaluationScoreDocument[]): {
    pairs: PairedScore[];
    skippedMissingPairs: number;
    skippedNullScores: number;
};
/**
 * Compute paired t-test results grouped by dataset and evaluator.
 * Accepts either raw score documents (which are paired internally)
 * or pre-computed pairs to avoid duplicate pairing work.
 */
export declare function computePairedTTestResults(pairs: PairedScore[]): PairedTTestResult[];
export declare function computePairedTTestResults(scoresA: EvaluationScoreDocument[], scoresB: EvaluationScoreDocument[]): PairedTTestResult[];
