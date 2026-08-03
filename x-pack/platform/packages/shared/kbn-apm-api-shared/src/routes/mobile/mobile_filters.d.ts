import { z } from '@kbn/zod/v4';
import { type MobilePropertyType } from '@kbn/apm-types';
export type MobileFiltersResponse = Array<{
    key: MobilePropertyType;
    options: string[];
}>;
export interface MobileFiltersRouteResponse {
    mobileFilters: MobileFiltersResponse;
}
export declare const mobileFiltersRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/mobile/filters";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileFiltersRouteResponse>;
