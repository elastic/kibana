import type { MlAnomalyDetectionAlertParams, PreviewResponse } from '@kbn/ml-common-types/alerts';
import type { HttpService } from '../http_service';
export declare const alertingApiProvider: (httpService: HttpService) => {
    preview(params: {
        alertParams: MlAnomalyDetectionAlertParams;
        timeRange: string;
        sampleSize?: number;
    }): Promise<PreviewResponse>;
};
export type AlertingApiService = ReturnType<typeof alertingApiProvider>;
/**
 * Hooks for accessing {@link AlertingApiService} in React components.
 */
export declare function useAlertingApiService(): AlertingApiService;
