import type { Duration } from 'moment';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
export interface TimeSeriesExplorerZoomState {
    from: string;
    to: string;
}
export interface ResolveContextFinishFocusRangeParams {
    zoom: TimeSeriesExplorerZoomState | undefined;
    contextAggregationInterval: Duration;
    bounds: TimeRangeBounds;
    selectedForecastId: string | undefined;
    previousSelectedForecastId: string | undefined;
    autoZoomDuration: number;
    contextChartData: unknown[];
    contextForecastData: unknown[] | undefined;
    calculateInitialFocusRange: (zoom: TimeSeriesExplorerZoomState | undefined, contextAggregationInterval: Duration, bounds: TimeRangeBounds) => [Date, Date] | undefined;
    calculateDefaultFocusRange: (autoZoomDuration: number, contextAggregationInterval: Duration, contextChartData: unknown[], contextForecastData: unknown[] | undefined) => [Date, Date] | undefined;
}
export interface ResolveContextFinishFocusRangeResult {
    focusRange: [Date, Date] | undefined;
    /** When true, callers should set previousSelectedForecastId = selectedForecastId (legacy finish() side effect). */
    shouldUpdatePreviousSelectedForecastId: boolean;
}
/**
 * Single merged rule for initial brush range after context chart data loads (finish()).
 * See refactor plan: parity item 4.
 */
export declare function resolveContextFinishFocusRange(params: ResolveContextFinishFocusRangeParams): ResolveContextFinishFocusRangeResult;
