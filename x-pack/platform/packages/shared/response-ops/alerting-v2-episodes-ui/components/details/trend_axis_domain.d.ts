import type { TrendPoint, TrendThreshold } from './trend_types';
export interface TrendAxisDomain {
    min: number;
    max: number;
}
/**
 * Computes the y-axis domain spanning the series data points and threshold lines, with a
 * small amount of padding so nothing is flush with the chart edge.
 *
 * `@elastic/charts` does not grow the domain to fit `LineAnnotation` (YDomain) values,
 * so a threshold outside the data range would otherwise be clipped.
 *
 * Returns `undefined` when there are no values at all — the chart then auto-fits.
 */
export declare const computeTrendAxisDomain: (points: TrendPoint[], thresholds: TrendThreshold[]) => TrendAxisDomain | undefined;
