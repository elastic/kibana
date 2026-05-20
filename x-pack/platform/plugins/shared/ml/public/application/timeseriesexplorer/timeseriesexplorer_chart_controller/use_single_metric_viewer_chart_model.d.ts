import type { Subject } from 'rxjs';
import type { ContextChartSelection } from './context_chart_zoom_pipeline';
export interface UseSingleMetricViewerChartModelOptions {
    /**
     * When false, focus pipeline skips anomalies table fetches (see plug-in contract).
     * @default true
     */
    includeAnomaliesTable?: boolean;
}
/**
 * Minimal headless primitives for hosts embedding the SMV chart.
 * Full chart state remains in `TimeSeriesExplorer` / `TimeSeriesExplorerEmbeddableChart` until those classes migrate to this hook.
 */
export declare function useSingleMetricViewerChartModel(options?: UseSingleMetricViewerChartModelOptions): {
    includeAnomaliesTable: boolean;
    contextChart$: Subject<ContextChartSelection>;
};
