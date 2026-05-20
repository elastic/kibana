import type { z } from '@kbn/zod/v4';
import type { partitionStream } from '@kbn/streams-ai';
import type { conditionSchema } from '@kbn/streamlang';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
export interface SuggestPartitionsParams {
    path: {
        name: string;
    };
    body: {
        connector_id: string;
        start: number;
        end: number;
        user_prompt?: string;
        existing_partitions?: Array<{
            name: string;
            condition: z.infer<typeof conditionSchema>;
        }>;
    };
}
export declare const suggestPartitionsSchema: z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        user_prompt: z.ZodOptional<z.ZodString>;
        existing_partitions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            condition: z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
type SuggestPartitionsResponse = Observable<ServerSentEventBase<'suggested_partitions', Awaited<ReturnType<typeof partitionStream>>>>;
export declare const suggestPartitionsRoute: Record<"POST /internal/streams/{name}/_suggest_partitions", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_partitions", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        user_prompt: z.ZodOptional<z.ZodString>;
        existing_partitions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            condition: z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SuggestPartitionsResponse, undefined>>;
export {};
