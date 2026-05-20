import type { Duration } from 'moment';
import type { Moment } from 'moment';
import { type Observable, type Subject, type Subscription } from 'rxjs';
import { type ContextChartSelection, type ContextChartZoomChartState } from './context_chart_zoom_pipeline';
import type { LoadSingleMetricContextDataSuccess } from './load_single_metric_context_data';
/**
 * Shared i18n keys for `loadSingleMetricContextData` error toasts (full-page SMV + embeddable chart).
 */
export declare function getSmvContextLoadErrorMessages(selectedForecastId: string | undefined): {
    metric: string;
    swimlane: string;
    entityCounts: string;
    forecast: string;
};
export interface ConsumeSmvContextLoadResultOptions {
    result: LoadSingleMetricContextDataSuccess | null;
    isUnmounted: () => boolean;
    loadCounterWhenStarted: number;
    readLoadCounter: () => number;
    /** Called when the loader requests syncing the “previous forecast” marker from current props. */
    syncPreviousSelectedForecastIdFromProps: () => void;
    /** Invoked when `zoomSelection` is returned (hosts typically forward to `contextChartSelected`). */
    applyZoomSelection?: (range: {
        from: Date;
        to: Date;
    }) => void;
    applyStatePatch: (patch: Record<string, unknown>) => void;
    /** e.g. embeddable `onRenderComplete` when chartable */
    afterStatePatch?: (patch: Record<string, unknown>) => void;
}
/**
 * Shared `.then` handling for `loadSingleMetricContextData` (stale guard + zoom + state).
 */
export declare function consumeSmvContextLoadResult(options: ConsumeSmvContextLoadResultOptions): void;
export interface SmvBrushToFocusZoomHost {
    includeAnomaliesTable: boolean;
    isBrushFocusInitPending: () => boolean;
    markBrushFocusInitHandled: () => void;
    onBrushPreview: (selection: ContextChartSelection) => void;
    readChartZoomState: () => ContextChartZoomChartState;
    onFocusPipelineStarting: () => void;
    getFocusAggregationInterval: (selection: ContextChartSelection) => Duration;
    getBoundsRoundedToInterval: (bounds: {
        min: Moment;
        max: Moment;
    }, interval: Duration, inclusiveEnd?: boolean) => {
        min: Moment;
        max: Moment;
    };
    getFocusData$: (selection: ContextChartSelection) => Observable<unknown> | undefined;
    getAnomaliesTableForRange$: (earliestMs: number, latestMs: number) => Observable<unknown>;
    readModelPlotEnabled: () => boolean;
    readSelectedForecastId: () => string | undefined;
    applyFocusPipelinePatch: (patch: Record<string, unknown>) => void;
}
/**
 * Shared brush → debounced focus (+ optional anomalies table) pipeline for SMV page + embeddable chart.
 */
export declare function subscribeSmvBrushToFocusZoom(contextChart$: Subject<ContextChartSelection>, host: SmvBrushToFocusZoomHost): Subscription;
