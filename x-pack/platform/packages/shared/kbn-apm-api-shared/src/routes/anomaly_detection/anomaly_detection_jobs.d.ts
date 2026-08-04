import type { ApmMlJob } from '@kbn/apm-types';
export interface AnomalyDetectionJobsResponse {
    jobs: ApmMlJob[];
    hasLegacyJobs: boolean;
}
export declare const anomalyDetectionJobsRoute: {
    endpoint: "GET /internal/apm/settings/anomaly-detection/jobs";
    params?: undefined;
} & import("../types").WithResponse<AnomalyDetectionJobsResponse>;
