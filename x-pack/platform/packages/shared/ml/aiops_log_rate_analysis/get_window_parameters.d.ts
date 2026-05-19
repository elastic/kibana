import type { WindowParameters } from './window_parameters';
/**
 * Given a point in time (e.g. where a user clicks), use simple heuristics to compute:
 *
 * 1. The time window around the click to evaluate for changes
 * 2. The historical time window prior to the click to use as a baseline.
 *
 * The philosophy here is that charts are displayed with different granularities according to their
 * overall time window. We select the log deviation and historical time windows inline with the
 * overall time window.
 *
 * The algorithm for doing this is based on the typical granularities that exist in machine data.
 *
 * @param clickTime timestamp of the clicked log rate deviation.
 * @param minTime minimum timestamp of the time window to be analysed
 * @param maxTime maximum timestamp of the time window to be analysed
 * @param clickTimeUpper optional timestamp to treat clicktime and clickTimeUpper
 *                       as a time range instead of point in time
 * @param windowGapOverride optional override for the baseline/deviation gap
 * @returns WindowParameters
 */
export declare const getWindowParameters: (clickTime: number, minTime: number, maxTime: number, clickTimeUpper?: number, windowGapOverride?: number) => WindowParameters;
