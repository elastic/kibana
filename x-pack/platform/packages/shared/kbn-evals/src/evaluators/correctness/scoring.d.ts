import type { CorrectnessAnalysis } from './types';
/**
 * Calculates the Factual Accuracy score using geometric mean of individual claim scores.
 *
 * This function computes the geometric mean of the scores assigned to each claim,
 * ensuring that a single critically incorrect claim (such as a contradicted central claim
 * with a score of 0.0) will result in an overall factual score of 0.0.
 */
export declare function calculateFactualScore(correctnessEvaluation: CorrectnessAnalysis): number;
/**
 * Calculates the Relevance score based on proportion of central vs peripheral claims.
 *
 * This function measures how effectively the response addresses the user's core query
 * by calculating the proportion of claims that are classified as 'central' compared to the total number of claims.
 */
export declare function calculateRelevanceScore(correctnessEvaluation: CorrectnessAnalysis): number;
/**
 * Calculates the Procedural Fidelity score for queries where order is critical.
 *
 * This score measures how well the agent's response follows the required order of
 * claims or steps from the ground truth. If sequence is not critical for the query,
 * it returns a perfect score of 1.0, as there is no order to evaluate.
 */
export declare function calculateProceduralFidelityScore(correctnessEvaluation: CorrectnessAnalysis): number;
