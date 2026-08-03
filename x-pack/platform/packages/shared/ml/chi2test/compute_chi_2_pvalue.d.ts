import type { Histogram } from './types';
/**
 * Compute the p-value for how similar the datasets are.
 * Returned value ranges from 0 to 1, with 1 meaning the datasets are identical.
 *
 * @param {Histogram[]} normalizedBaselineTerms - An array of normalized baseline terms (Histogram objects).
 * @param {Histogram[]} normalizedDriftedTerms - An array of normalized drifted terms (Histogram objects).
 * @returns {number} The p-value indicating the similarity of the datasets.
 */
export declare const computeChi2PValue: (normalizedBaselineTerms: Histogram[], normalizedDriftedTerms: Histogram[]) => number;
