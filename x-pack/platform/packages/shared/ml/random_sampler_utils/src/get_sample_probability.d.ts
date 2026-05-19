/**
 * Returns a dynamic sample probability to be used with the `random_sampler` aggregation.
 * @param {number} totalDocCount The total document count to derive the sample probability from.
 * @returns {number} sample probability
 */
export declare function getSampleProbability(totalDocCount: number): number;
