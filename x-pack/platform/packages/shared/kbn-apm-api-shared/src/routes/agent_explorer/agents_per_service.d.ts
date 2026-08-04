import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/apm-types';
export interface AgentExplorerAgentsResponse {
    items: Array<{
        agentDocsPageUrl: string | undefined;
        serviceName: string;
        environments: string[];
        agentName: AgentName;
        agentVersion: string[];
        agentTelemetryAutoVersion: string[];
        instances: number;
        latestVersion?: string;
    }>;
}
export declare const agentsPerServiceRoute: {
    endpoint: "GET /internal/apm/get_agents_per_service";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            probability: z.ZodCoercedNumber<unknown>;
            serviceName: z.ZodOptional<z.ZodString>;
            agentLanguage: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<AgentExplorerAgentsResponse>;
