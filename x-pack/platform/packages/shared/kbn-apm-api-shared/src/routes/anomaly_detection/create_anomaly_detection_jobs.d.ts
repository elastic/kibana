import { z } from '@kbn/zod/v4';
export interface CreateAnomalyDetectionJobsResponse {
    jobCreated: true;
}
export declare const createAnomalyDetectionJobsRoute: {
    endpoint: "POST /internal/apm/settings/anomaly-detection/jobs";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            environments: z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<CreateAnomalyDetectionJobsResponse>;
