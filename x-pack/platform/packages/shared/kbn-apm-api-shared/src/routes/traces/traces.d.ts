import { z } from '@kbn/zod/v4';
import { type AgentName } from '@kbn/apm-types';
import type { TRANSACTION_NAME, SERVICE_NAME } from '@kbn/apm-types';
export type BucketKey = Record<typeof TRANSACTION_NAME | typeof SERVICE_NAME, string>;
export interface TopTracesPrimaryStatsResponse {
    items: Array<{
        key: BucketKey;
        serviceName: string;
        transactionName: string;
        averageResponseTime: number | null;
        transactionsPerMinute: number;
        transactionType: string;
        impact: number;
        agentName: AgentName;
    }>;
}
export declare const tracesRoute: {
    endpoint: "GET /internal/apm/traces";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            probability: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopTracesPrimaryStatsResponse>;
