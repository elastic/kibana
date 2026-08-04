export interface AnomalyDetectionEnvironmentsResponse {
    environments: string[];
}
export declare const anomalyDetectionEnvironmentsRoute: {
    endpoint: "GET /internal/apm/settings/anomaly-detection/environments";
    params?: undefined;
} & import("../types").WithResponse<AnomalyDetectionEnvironmentsResponse>;
