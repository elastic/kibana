import { z } from '@kbn/zod/v4';
import type { Annotation } from '@kbn/apm-types';
export interface ServiceAnnotationResponse {
    annotations: Annotation[];
}
export declare const serviceAnnotationsSearchRoute: {
    endpoint: "GET /api/apm/services/{serviceName}/annotation/search 2023-10-31";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceAnnotationResponse>;
