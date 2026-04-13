export { formatMillisecondsInUnit, parseInterval, toMilliseconds } from '../../shared';
/**
 * Extract the index from an ArrayItem path like `_meta.downsampleSteps[3]`.
 * Returns -1 if not a recognized step path.
 */
export declare const getStepIndexFromArrayItemPath: (path: string) => number;
