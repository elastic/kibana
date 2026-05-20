import type { Observable } from 'rxjs';
import type { MlEntityField, ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { ModelPlotOutput } from '../../services/results_service/result_service_rx';
import type { MlApi } from '../../services/ml_api_service';
import { type MlResultsService } from '../../services/results_service';
export declare function timeSeriesSearchServiceFactory(mlResultsService: MlResultsService, mlApi: MlApi): {
    getMetricData: (job: Job, detectorIndex: number, entityFields: MlEntityField[], earliestMs: number, latestMs: number, intervalMs: number, esMetricFunction?: string) => Observable<ModelPlotOutput>;
    getChartDetails: (job: Job, detectorIndex: number, entityFields: MlEntityField[], earliestMs: number, latestMs: number, metricFunctionDescription?: ES_AGGREGATION) => Promise<unknown>;
};
export type MlTimeSeriesSearchService = ReturnType<typeof timeSeriesSearchServiceFactory>;
export declare function useTimeSeriesSearchService(): MlTimeSeriesSearchService;
