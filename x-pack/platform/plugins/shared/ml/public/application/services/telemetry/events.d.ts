import type { TrainedModelsModelTestedEbtProps , TrainedModelsTelemetryEventTypes} from './types';
import { type TrainedModelsDeploymentEbtProps, type TrainedModelsModelDownloadEbtProps } from './types';
export declare const trainedModelsEbtEvents: {
    trainedModelsDeploymentCreatedEventType: {
        eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED;
        schema: import("@elastic/ebt").RootSchema<TrainedModelsDeploymentEbtProps>;
    };
    trainedModelsModelDownloadEventType: {
        eventType: TrainedModelsTelemetryEventTypes.MODEL_DOWNLOAD;
        schema: import("@elastic/ebt").RootSchema<TrainedModelsModelDownloadEbtProps>;
    };
    trainedModelsDeploymentUpdatedEventType: {
        eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_UPDATED;
        schema: import("@elastic/ebt").RootSchema<TrainedModelsDeploymentEbtProps>;
    };
    trainedModelsModelTestedEventType: {
        eventType: TrainedModelsTelemetryEventTypes.MODEL_TESTED;
        schema: import("@elastic/ebt").RootSchema<TrainedModelsModelTestedEbtProps>;
    };
};
