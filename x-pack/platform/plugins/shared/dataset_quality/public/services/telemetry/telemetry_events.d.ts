import type { DatasetNavigatedEbtProps } from './types';
import { DatasetQualityTelemetryEventTypes } from './types';
export declare const datasetQualityEbtEvents: {
    datasetNavigatedEventType: {
        eventType: DatasetQualityTelemetryEventTypes.NAVIGATED;
        schema: import("@elastic/ebt").RootSchema<DatasetNavigatedEbtProps>;
    };
    datasetDetailsOpenedEventType: {
        eventType: DatasetQualityTelemetryEventTypes.DETAILS_OPENED;
        schema: import("@elastic/ebt").RootSchema<import("./types").DatasetDetailsEbtProps & import("./types").WithTrackingId & import("./types").WithDuration>;
    };
    datasetDetailsNavigatedEventType: {
        eventType: DatasetQualityTelemetryEventTypes.DETAILS_NAVIGATED;
        schema: import("@elastic/ebt").RootSchema<import("./types").DatasetDetailsNavigatedEbtProps & import("./types").WithTrackingId>;
    };
    datasetDetailsBreakdownFieldChangedEventType: {
        eventType: DatasetQualityTelemetryEventTypes.BREAKDOWN_FIELD_CHANGED;
        schema: import("@elastic/ebt").RootSchema<import("./types").DatasetDetailsEbtProps & import("./types").WithTrackingId>;
    };
    failureStoreUpdatedEventType: {
        eventType: DatasetQualityTelemetryEventTypes.FAILURE_STORE_UPDATED;
        schema: import("@elastic/ebt").RootSchema<import("./types").FailureStoreUpdateEbtProps>;
    };
};
