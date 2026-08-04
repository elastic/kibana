import { z } from '@kbn/zod/v4';
import { type APMDownstreamDependency } from '@kbn/apm-types';
export interface GetDownstreamDependenciesResponse {
    content: APMDownstreamDependency[];
}
export declare const getDownstreamDependenciesRoute: {
    endpoint: "GET /internal/apm/assistant/get_downstream_dependencies";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceName: z.ZodString;
            start: z.ZodString;
            end: z.ZodString;
            serviceEnvironment: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<GetDownstreamDependenciesResponse>;
