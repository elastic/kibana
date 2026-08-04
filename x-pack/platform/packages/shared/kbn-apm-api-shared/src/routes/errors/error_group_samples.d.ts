import { z } from '@kbn/zod/v4';
export interface ErrorGroupSampleIdsResponse {
    errorSampleIds: string[];
    occurrencesCount: number;
}
export declare const errorGroupSamplesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/samples";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
            groupId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorGroupSampleIdsResponse>;
