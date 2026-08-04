import { z } from '@kbn/zod/v4';
import type { TopNFunctions } from '@kbn/profiling-utils';
export type ServicesFunctionsResponse = TopNFunctions;
export declare const servicesFunctionsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/profiling/functions";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            transactionName: z.ZodOptional<z.ZodString>;
            startIndex: z.ZodCoercedNumber<unknown>;
            endIndex: z.ZodCoercedNumber<unknown>;
            transactionType: z.ZodString;
            kuery: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopNFunctions>;
