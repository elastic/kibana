export declare const anomalyDetectionRouteDefinitions: {
    jobs: {
        endpoint: "GET /internal/apm/settings/anomaly-detection/jobs";
        params?: undefined;
    } & import("../types").WithResponse<import("./anomaly_detection_jobs").AnomalyDetectionJobsResponse>;
    createJobs: {
        endpoint: "POST /internal/apm/settings/anomaly-detection/jobs";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                environments: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./create_anomaly_detection_jobs").CreateAnomalyDetectionJobsResponse>;
    environments: {
        endpoint: "GET /internal/apm/settings/anomaly-detection/environments";
        params?: undefined;
    } & import("../types").WithResponse<import("./anomaly_detection_environments").AnomalyDetectionEnvironmentsResponse>;
    updateToV3: {
        endpoint: "POST /internal/apm/settings/anomaly-detection/update_to_v3";
        params?: undefined;
    } & import("../types").WithResponse<import("./anomaly_detection_update_to_v3").AnomalyDetectionUpdateToV3Response>;
};
export type { AnomalyDetectionJobsResponse } from './anomaly_detection_jobs';
export type { CreateAnomalyDetectionJobsResponse } from './create_anomaly_detection_jobs';
export type { AnomalyDetectionEnvironmentsResponse } from './anomaly_detection_environments';
export type { AnomalyDetectionUpdateToV3Response } from './anomaly_detection_update_to_v3';
