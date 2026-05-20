import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from './ml_api_service';
export interface AggType {
    avg: string;
    max: string;
    min: string;
}
export declare function forecastServiceFactory(mlApi: MlApi): {
    getForecastsSummary: (job: Job, query: any, earliestMs: number, maxResults: any) => Promise<unknown>;
    getForecastDateRange: (job: Job, forecastId: string) => Promise<{
        success: boolean;
        earliest: number | null;
        latest: number | null;
    }>;
    getForecastData: (job: Job, detectorIndex: number, forecastId: string, entityFields: any, earliestMs: number, latestMs: number, intervalMs: number, aggType?: AggType) => import("rxjs").Observable<{
        success: boolean;
        results: Record<number, any>;
    }>;
    runForecast: (jobId: string, duration?: string, neverExpires?: boolean) => Promise<unknown>;
    getForecastRequestStats: (job: Job, forecastId: string) => Promise<unknown>;
};
export type MlForecastService = ReturnType<typeof forecastServiceFactory>;
export declare function useForecastService(): MlForecastService;
