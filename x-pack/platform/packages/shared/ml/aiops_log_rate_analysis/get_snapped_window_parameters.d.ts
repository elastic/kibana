import type { WindowParameters } from './window_parameters';
/**
 *
 * Converts window paramaters from the brushes to “snap” the brushes to the chart histogram bar width and ensure timestamps
 * correspond to bucket timestamps
 *
 * @param windowParameters time range definition for baseline and deviation to be used by log rate analysis
 * @param snapTimestamps time range definition that always corresponds to histogram bucket timestamps
 * @returns WindowParameters
 */
export declare const getSnappedWindowParameters: (windowParameters: WindowParameters, snapTimestamps: number[]) => WindowParameters;
