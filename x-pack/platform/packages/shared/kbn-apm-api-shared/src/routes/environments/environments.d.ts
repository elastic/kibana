import { z } from '@kbn/zod/v4';
import type { Environment } from '@kbn/apm-types';
export interface EnvironmentsResponse {
    environments: Environment[];
}
export declare const environmentsRoute: {
    endpoint: "GET /internal/apm/environments";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            serviceName: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<EnvironmentsResponse>;
