import { z } from '@kbn/zod/v4';
export type MobileTermsByFieldResponse = Array<{
    label: string;
    count: number;
}>;
export interface MobileTermsByFieldRouteResponse {
    terms: MobileTermsByFieldResponse;
}
export declare const mobileTermsByFieldRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/terms";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            size: z.ZodCoercedNumber<unknown>;
            fieldName: z.ZodString;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileTermsByFieldRouteResponse>;
