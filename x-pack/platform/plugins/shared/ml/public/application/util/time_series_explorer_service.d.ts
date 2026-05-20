import type { Observable } from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core/public';
import { type MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds, TimeBucketsInterval } from '@kbn/ml-time-buckets';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { MlApi } from '../services/ml_api_service';
import { type MlResultsService } from '../services/results_service';
export interface Interval {
    asMilliseconds: () => number;
    expression: string;
}
export interface ChartDataPoint {
    date: Date;
    value: number | null;
    upper?: number | null;
    lower?: number | null;
}
export interface FocusData {
    focusChartData: ChartDataPoint[];
    anomalyRecords: MlAnomalyRecordDoc[];
    scheduledEvents: any;
    showForecastCheckbox?: boolean;
    focusAnnotationError?: string;
    focusAnnotationData?: any[];
    focusForecastData?: any;
}
export declare function timeSeriesExplorerServiceFactory(uiSettings: IUiSettingsClient, mlApi: MlApi, mlResultsService: MlResultsService): {
    getAutoZoomDuration: (bucketSpan: Job["analysis_config"]["bucket_span"]) => number | undefined;
    calculateAggregationInterval: (bounds: TimeRangeBounds, bucketsTarget: number | undefined, selectedJob: Job) => TimeBucketsInterval | undefined;
    calculateInitialFocusRange: (zoomState: any, contextAggregationInterval: any, bounds: TimeRangeBounds) => Date[] | undefined;
    calculateDefaultFocusRange: (autoZoomDuration: any, contextAggregationInterval: any, contextChartData: any, contextForecastData: any) => Date[];
    processRecordScoreResults: (scoreData: any) => any;
    processMetricPlotResults: (metricPlotData: any, modelPlotEnabled: any) => any;
    processForecastResults: (forecastData: any) => any;
    findChartPointForAnomalyTime: (chartData: any, anomalyTime: any, aggregationInterval: any) => any;
    processDataForFocusAnomalies: (chartData: ChartDataPoint[], anomalyRecords: MlAnomalyRecordDoc[], aggregationInterval: Interval, modelPlotEnabled: boolean, functionDescription?: string) => ChartDataPoint[];
    findChartPointForScheduledEvent: (chartData: any, eventTime: any) => any;
    processScheduledEventsForChart: (chartData: ChartDataPoint[], scheduledEvents: Array<{
        events: any;
        time: number;
    }> | undefined, aggregationInterval: TimeBucketsInterval) => ChartDataPoint[];
    getFocusData: (criteriaFields: CriteriaField[], detectorIndex: number, focusAggregationInterval: TimeBucketsInterval, forecastId: string, modelPlotEnabled: boolean, nonBlankEntities: any[], searchBounds: any, selectedJob: Job, functionDescription?: string | undefined) => Observable<FocusData>;
};
export declare function useTimeSeriesExplorerService(): TimeSeriesExplorerService;
export type TimeSeriesExplorerService = ReturnType<typeof timeSeriesExplorerServiceFactory>;
