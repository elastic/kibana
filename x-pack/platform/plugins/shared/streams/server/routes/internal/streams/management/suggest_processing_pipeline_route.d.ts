import { z } from '@kbn/zod/v4';
import { type SuggestProcessingPipelineResult } from '@kbn/streams-ai';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { type FlattenRecord } from '@kbn/streams-schema';
export interface SuggestIngestPipelineParams {
    path: {
        name: string;
    };
    body: {
        connector_id: string;
        documents: FlattenRecord[];
    };
}
export declare const suggestIngestPipelineSchema: z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        documents: z.ZodArray<z.ZodType<FlattenRecord, unknown, z.core.$ZodTypeInternals<FlattenRecord, unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
type SuggestProcessingPipelineResponse = Observable<ServerSentEventBase<'suggested_processing_pipeline', {
    pipeline: SuggestProcessingPipelineResult['pipeline'];
}>>;
export declare const suggestProcessingPipelineRoute: Record<"POST /internal/streams/{name}/_suggest_processing_pipeline", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_processing_pipeline", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        documents: z.ZodArray<z.ZodType<FlattenRecord, unknown, z.core.$ZodTypeInternals<FlattenRecord, unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SuggestProcessingPipelineResponse, undefined>>;
export {};
