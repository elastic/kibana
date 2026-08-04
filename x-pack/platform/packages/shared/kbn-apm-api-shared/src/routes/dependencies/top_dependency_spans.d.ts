import { z } from '@kbn/zod/v4';
import type { AgentName, EventOutcome } from '@kbn/apm-types';
export interface DependencySpan {
    '@timestamp': number;
    spanId: string;
    spanName: string;
    serviceName: string;
    agentName: AgentName;
    traceId: string;
    transactionId?: string;
    transactionType?: string;
    transactionName?: string;
    duration: number;
    outcome: EventOutcome;
}
export interface TopDependencySpansResponse {
    spans: DependencySpan[];
}
export declare const topDependencySpansRoute: {
    endpoint: "GET /internal/apm/dependencies/operations/spans";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            dependencyName: z.ZodString;
            spanName: z.ZodString;
            sampleRangeFrom: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            sampleRangeTo: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopDependencySpansResponse>;
