import { z } from '@kbn/zod/v4';
import type { SearchHit } from '@kbn/es-types';
import type { AgentConfiguration } from '@kbn/apm-common';
declare const searchParamsSchema: z.ZodObject<{
    service: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        environment: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    etag: z.ZodOptional<z.ZodString>;
    mark_as_applied_by_agent: z.ZodOptional<z.ZodBoolean>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AgentConfigSearchParams = z.infer<typeof searchParamsSchema>;
export type SearchAgentConfigurationResponse = SearchHit<AgentConfiguration, undefined, undefined> | null;
export declare const searchAgentConfigurationRoute: {
    endpoint: "POST /api/apm/settings/agent-configuration/search 2023-10-31";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            service: z.ZodObject<{
                name: z.ZodOptional<z.ZodString>;
                environment: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            etag: z.ZodOptional<z.ZodString>;
            mark_as_applied_by_agent: z.ZodOptional<z.ZodBoolean>;
            error: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SearchAgentConfigurationResponse>;
export {};
