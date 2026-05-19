import type { TypeOf } from '@kbn/config-schema';
import { mlAnomalyDetectionAlertParamsSchema } from '@kbn/response-ops-rule-params/anomaly_detection';
import type { anomalyDetectionJobsHealthRuleParamsSchema } from '@kbn/response-ops-rule-params/anomaly_detection_jobs_health';
export declare const mlAnomalyDetectionAlertPreviewRequest: import("@kbn/config-schema").ObjectType<{
    alertParams: import("@kbn/config-schema").ObjectType<{
        jobSelection: import("@kbn/config-schema").ObjectType<{
            jobIds: import("@kbn/config-schema").Type<string[]>;
            groupIds: import("@kbn/config-schema").Type<string[]>;
        }>;
        severity: import("@kbn/config-schema").Type<number>;
        resultType: import("@kbn/config-schema").Type<"record" | "bucket" | "influencer">;
        includeInterim: import("@kbn/config-schema").Type<boolean>;
        lookbackInterval: import("@kbn/config-schema").Type<string | null>;
        topNBuckets: import("@kbn/config-schema").Type<number | null>;
        kqlQueryString: import("@kbn/config-schema").Type<string | null>;
    }>;
    /**
     * Relative time range to look back from now, e.g. 1y, 8m, 15d
     */
    timeRange: import("@kbn/config-schema").Type<string>;
    /**
     * Number of top hits to return
     */
    sampleSize: import("@kbn/config-schema").Type<number>;
}>;
export type MlAnomalyDetectionAlertParams = TypeOf<typeof mlAnomalyDetectionAlertParamsSchema>;
export type MlAnomalyDetectionAlertPreviewRequest = TypeOf<typeof mlAnomalyDetectionAlertPreviewRequest>;
export type AnomalyDetectionJobsHealthRuleParams = TypeOf<typeof anomalyDetectionJobsHealthRuleParamsSchema>;
export type TestsConfig = AnomalyDetectionJobsHealthRuleParams['testsConfig'];
export type JobSelection = AnomalyDetectionJobsHealthRuleParams['includeJobs'];
