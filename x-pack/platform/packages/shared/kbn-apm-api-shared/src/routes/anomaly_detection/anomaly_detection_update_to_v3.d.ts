export interface AnomalyDetectionUpdateToV3Response {
    update: boolean;
}
export declare const anomalyDetectionUpdateToV3Route: {
    endpoint: "POST /internal/apm/settings/anomaly-detection/update_to_v3";
    params?: undefined;
} & import("../types").WithResponse<AnomalyDetectionUpdateToV3Response>;
