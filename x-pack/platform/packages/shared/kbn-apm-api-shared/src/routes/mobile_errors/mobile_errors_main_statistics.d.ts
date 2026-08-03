import { z } from '@kbn/zod/v4';
export type MobileErrorGroupMainStatisticsResponse = Array<{
    groupId: string;
    name: string;
    lastSeen: number;
    occurrences: number;
    culprit: string | undefined;
    handled: boolean | undefined;
    type: string | undefined;
}>;
export interface MobileErrorsMainStatisticsRouteResponse {
    errorGroups: MobileErrorGroupMainStatisticsResponse;
}
export declare const mobileErrorsMainStatisticsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            sortField: z.ZodOptional<z.ZodString>;
            sortDirection: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"asc">, z.ZodLiteral<"desc">]>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileErrorsMainStatisticsRouteResponse>;
