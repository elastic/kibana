import { z } from '@kbn/zod/v4';
export type MobileErrorTermsByFieldResponse = Array<{
    label: string;
    count: number;
}>;
export interface MobileErrorTermsRouteResponse {
    terms: MobileErrorTermsByFieldResponse;
}
export declare const mobileErrorTermsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/error_terms";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            size: z.ZodCoercedNumber<unknown>;
            fieldName: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileErrorTermsRouteResponse>;
