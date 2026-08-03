import { z } from '@kbn/zod/v4';
import type { ServerlessType } from '@kbn/apm-types';
export interface ServiceAgentResponse {
    agentName?: string;
    runtimeName?: string;
    runtimeVersion?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    serverlessType?: ServerlessType;
}
export declare const serviceAgentRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/agent";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceAgentResponse>;
