import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ITelemetryClient, TrainedModelsDeploymentEbtProps, TrainedModelsModelDownloadEbtProps, TrainedModelsModelTestedEbtProps } from './types';
export declare class TelemetryClient implements ITelemetryClient {
    private analytics;
    constructor(analytics: AnalyticsServiceSetup);
    trackTrainedModelsDeploymentCreated: (eventProps: TrainedModelsDeploymentEbtProps) => void;
    trackTrainedModelsModelDownload: (eventProps: TrainedModelsModelDownloadEbtProps) => void;
    trackTrainedModelsDeploymentUpdated: (eventProps: TrainedModelsDeploymentEbtProps) => void;
    trackTrainedModelsModelTested: (eventProps: TrainedModelsModelTestedEbtProps) => void;
}
