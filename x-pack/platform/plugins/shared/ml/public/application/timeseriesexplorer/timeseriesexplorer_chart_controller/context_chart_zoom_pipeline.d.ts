import type { Subject } from 'rxjs';
import { type Observable, type Subscription } from 'rxjs';
export interface ContextChartSelection {
    from: Date;
    to: Date;
}
export interface ContextChartZoomChartState {
    contextChartData?: unknown[];
    contextForecastData?: unknown[];
    focusChartData?: unknown;
    zoomFromFocusLoaded?: Date;
    zoomToFocusLoaded?: Date;
}
export interface ContextChartZoomHandlers<TFocus = unknown, TTable = unknown> {
    includeAnomaliesTable: boolean;
    /** First tap: update brush preview (zoomFrom/zoomTo). */
    onZoomPreview: (selection: ContextChartSelection) => void;
    /** Read mutable chart + focus state (typically React state snapshot). */
    getChartState: () => ContextChartZoomChartState;
    /** True when init needs focus load or brush range changed vs last loaded focus. */
    shouldTriggerFocusLoad: (selection: ContextChartSelection, state: ContextChartZoomChartState) => boolean;
    /** Set loading before focus queries (fullRefresh false, loading true). */
    onFocusLoadStart: () => void;
    /** Mark init flag true when entering focus load path (legacy contextChartSelectedInitCallDone). */
    onFocusLoadInit: () => void;
    /**
     * Pipeline for the brushed range after debounce.
     * - When `includeAnomaliesTable` is **true**, return `forkJoin([focus$, table$])` (one emission: `[TFocus, TTable]`).
     * - When **false**, return **only** the focus observable; the factory merges `{ tableData: undefined }` so
     *   `onFocusPipelineResult` keeps the same tuple shape without running a table request.
     */
    getFocusPipeline$: (selection: ContextChartSelection) => Observable<[TFocus, TTable] | TFocus> | null;
    /** Merge focus + optional table payload into component state. */
    onFocusPipelineResult: (data: [TFocus, TTable], selection: ContextChartSelection) => void;
}
/**
 * Shared debounced brush → focus pipeline used by SMV page and embeddable chart.
 *
 * Chart-only mode (`includeAnomaliesTable: false`): callers return **only** `getFocusData$` from
 * `getFocusPipeline$`; this factory appends `{ tableData: undefined }` so `onFocusPipelineResult` stays unchanged.
 */
export declare function createContextChartZoomSubscription<TFocus = unknown, TTable = unknown>(contextChart$: Subject<ContextChartSelection>, handlers: ContextChartZoomHandlers<TFocus, TTable>): Subscription;
