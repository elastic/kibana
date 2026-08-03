import { z } from '@kbn/zod/v4';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
export type ServicesFlamegraphResponse = BaseFlameGraph;
export declare const servicesFlamegraphRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/profiling/flamegraph";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<BaseFlameGraph>;
