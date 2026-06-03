import type { GroundednessAnalysis } from './types';
/**
 * Calculates the groundedness score using geometric mean of individual claim scores.
 *
 * This function computes the geometric mean of the scores assigned to each claim,
 * ensuring that a single critically incorrect claim (such as a contradicted central claim
 * with a score of 0.0) will result in an overall groundedness score of 0.0.
 */
export declare function calculateGroundednessScore(groundednessAnalysis: GroundednessAnalysis): number;
