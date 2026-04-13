import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ITelemetryClient, DatasetDetailsEbtProps, DatasetDetailsNavigatedEbtProps, DatasetDetailsTrackingState, DatasetNavigatedEbtProps, FailureStoreUpdateEbtProps } from './types';
export declare class TelemetryClient implements ITelemetryClient {
    private analytics;
    private datasetDetailsTrackingId;
    private startTime;
    private datasetDetailsState;
    constructor(analytics: AnalyticsServiceSetup);
    trackDatasetNavigated: (eventProps: DatasetNavigatedEbtProps) => void;
    startDatasetDetailsTracking(): void;
    getDatasetDetailsTrackingState(): DatasetDetailsTrackingState;
    trackDatasetDetailsOpened: (eventProps: DatasetDetailsEbtProps) => void;
    trackDatasetDetailsNavigated: (eventProps: DatasetDetailsNavigatedEbtProps) => void;
    trackDatasetDetailsBreakdownFieldChanged: (eventProps: DatasetDetailsEbtProps) => void;
    trackFailureStoreUpdated: (eventProps: FailureStoreUpdateEbtProps) => void;
}
