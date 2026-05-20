import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { Duration, Moment } from 'moment';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { TimeSeriesExplorerZoomState } from './resolve_context_finish_focus_range';
/**
 * Forecast aggregation override for context / focus loads when model plot is off
 * and the detector uses sum or count (matches SMV + embeddable behavior).
 */
export declare function getForecastAggTypeForContextLoad(modelPlotEnabled: boolean, detector: {
    function: string;
}): {
    avg: string;
    max: string;
    min: string;
} | undefined;
export interface LoadSingleMetricContextDataEntityControl {
    fieldValue: string | null;
    fieldName: string;
}
/**
 * Shape of the chart-details result returned by `mlTimeSeriesSearchService.getChartDetails`.
 * Mirrors `TimeSeriesExplorerChartDetails.results` in `time_series_search_service.ts` (not exported).
 */
export interface SmvChartDetails {
    functionLabel: string | null;
    entityData: {
        count?: number;
        entities: Array<{
            fieldName: string;
            cardinality?: number;
        }>;
    };
}
export interface LoadSingleMetricContextDataDeps {
    mlTimeSeriesSearchService: {
        getMetricData: (job: CombinedJob, detectorIndex: number, entities: LoadSingleMetricContextDataEntityControl[], earliestMs: number, latestMs: number, intervalMs: number, 
        /** `aggregationTypeTransform.toES(functionDescription)` for metric detectors. */
        functionToPlotByIfMetric: string | undefined) => import('rxjs').Observable<{
            results: Record<string, unknown>;
        }>;
        getChartDetails: (job: CombinedJob, detectorIndex: number, entityFields: LoadSingleMetricContextDataEntityControl[], earliestMs: number, latestMs: number, metricFunctionDescription?: string) => Promise<{
            success: boolean;
            results: SmvChartDetails;
        }>;
    };
    mlResultsService: {
        getRecordMaxScoreByTime: (jobId: string, criteriaFields: CriteriaField[], earliestMs: number, latestMs: number, intervalMs: number, 
        /** `aggregationTypeTransform.toES(functionDescription)` for metric detectors. */
        functionToPlotByIfMetric: string | undefined) => Promise<{
            results: Record<string, unknown>;
        }>;
    };
    mlForecastService: {
        getForecastData: (job: CombinedJob, detectorIndex: number, forecastId: string, entities: LoadSingleMetricContextDataEntityControl[], earliestMs: number, latestMs: number, intervalMs: number, aggType: ReturnType<typeof getForecastAggTypeForContextLoad>) => import('rxjs').Observable<{
            results: Record<string, unknown>;
        }>;
    };
    mlTimeSeriesExplorer: {
        calculateAggregationInterval: (bounds: TimeRangeBounds, target: number, job: CombinedJob) => Duration;
        processMetricPlotResults: (results: Record<string, unknown>, modelPlotEnabled: boolean) => unknown[];
        processRecordScoreResults: (results: Record<string, unknown>) => unknown[];
        processForecastResults: (results: Record<string, unknown>) => unknown[];
        calculateInitialFocusRange: (zoom: TimeSeriesExplorerZoomState | undefined, contextAggregationInterval: Duration, bounds: TimeRangeBounds) => [Date, Date] | undefined;
        calculateDefaultFocusRange: (autoZoomDuration: number, contextAggregationInterval: Duration, contextChartData: unknown[], contextForecastData: unknown[] | undefined) => [Date, Date] | undefined;
    };
    getBoundsRoundedToInterval: (bounds: TimeRangeBounds, interval: Duration, inclusiveEnd?: boolean) => {
        min: Moment;
        max: Moment;
    };
}
export interface LoadSingleMetricContextDataParams {
    signal?: AbortSignal;
    bounds: TimeRangeBounds;
    selectedJob: CombinedJob;
    detectorIndex: number;
    entityControls: LoadSingleMetricContextDataEntityControl[];
    modelPlotEnabled: boolean;
    selectedForecastId: string | undefined;
    /** Result of `aggregationTypeTransform.toES(functionDescription)` when metric job. */
    functionToPlotByIfMetric: string | undefined;
    /** Raw function description from app state (metric jobs). */
    functionDescription: string | undefined;
    zoom: TimeSeriesExplorerZoomState | undefined;
    previousSelectedForecastId: string | undefined;
    autoZoomDuration: number;
    arePartitioningFieldsProvided: boolean;
    criteriaFields: CriteriaField[];
    displayError: (error: unknown, message: string) => void;
    errorMessages: {
        metric: string;
        swimlane: string;
        entityCounts: string;
        forecast: string;
    };
    deps: LoadSingleMetricContextDataDeps;
}
export interface LoadSingleMetricContextDataSuccess {
    statePatch: Record<string, unknown>;
    zoomSelection?: {
        from: Date;
        to: Date;
    };
    shouldUpdatePreviousSelectedForecastId: boolean;
}
/**
 * Parallel context-chart queries for SMV (page + embeddable). React callers own `setState`
 * and `contextChartSelected`; this module only performs I/O + pure merge math.
 *
 * Pass `signal` from a per-load `AbortController`: when aborted, this function resolves **`null`**
 * as soon as the abort wins the race (still combine with `loadCounter` checks in React). Underlying
 * HTTP may complete in the background until services accept `AbortSignal`.
 */
export declare function loadSingleMetricContextData(params: LoadSingleMetricContextDataParams): Promise<LoadSingleMetricContextDataSuccess | null>;
/**
 * Shared model-plot flag used when resetting chart state on full refresh.
 */
export declare function getModelPlotEnabledForDetector(selectedJob: CombinedJob, detectorIndex: number, entityControls: LoadSingleMetricContextDataEntityControl[]): boolean;
