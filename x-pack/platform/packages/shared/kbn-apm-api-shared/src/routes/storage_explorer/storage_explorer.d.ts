import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/elastic-agent-utils';
export type StorageExplorerServiceStatisticsResponse = Array<{
    serviceName: string;
    sampling: number;
    environments: string[];
    size: number;
    agentName: AgentName;
}>;
export interface StorageExplorerRouteResponse {
    serviceStatistics: StorageExplorerServiceStatisticsResponse;
}
export declare const storageExplorerRoute: {
    endpoint: "GET /internal/apm/storage_explorer";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            indexLifecyclePhase: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, z.ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
            probability: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<StorageExplorerRouteResponse>;
