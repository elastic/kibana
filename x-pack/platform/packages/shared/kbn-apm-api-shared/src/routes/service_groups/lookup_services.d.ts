import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/apm-types';
export type LookupServicesResponse = Array<{
    serviceName: string;
    environments: string[];
    agentName: AgentName;
}>;
export interface LookupServicesRouteResponse {
    items: LookupServicesResponse;
}
export declare const serviceGroupServicesRoute: {
    endpoint: "GET /internal/apm/service-group/services";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<LookupServicesRouteResponse>;
