import { z } from '@kbn/zod/v4';
import type { IngestionTimeRanges } from '@kbn/apm-types';
export interface ServiceMixedIngestionResponse {
    hasMultipleAgentTypes: boolean;
    ingestionTimeRanges?: IngestionTimeRanges;
}
export declare const serviceMixedIngestionRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMixedIngestionResponse>;
