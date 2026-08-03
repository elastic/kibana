import { z } from '@kbn/zod/v4';
import type { AnomalyDetectorType, Environment } from '@kbn/apm-types';
export interface ServiceAnomalyScoreResponse {
    anomalyScore?: number;
    detectorType?: AnomalyDetectorType;
    anomalyEnvironment?: Environment;
}
export declare const serviceAnomalyScoreRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/anomaly_score";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceAnomalyScoreResponse>;
