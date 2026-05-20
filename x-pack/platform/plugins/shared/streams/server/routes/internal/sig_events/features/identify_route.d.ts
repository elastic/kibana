import { z } from '@kbn/zod/v4';
export declare const identifyFeaturesRoutes: {
    "GET /internal/streams/{streamName}/features/_should_identify": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/features/_should_identify", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            thresholdHours: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("../../../../lib/sig_events/features/should_identify_features").ShouldIdentifyFeaturesResult, undefined>;
    "POST /internal/streams/{streamName}/features/_identify/computed": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/features/_identify/computed", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            start: z.ZodOptional<z.ZodNumber>;
            end: z.ZodOptional<z.ZodNumber>;
            runId: z.ZodOptional<z.ZodString>;
            featureTtlDays: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        computedFeatures: ({
            id: string;
            stream_name: string;
            type: string;
            description: string;
            properties: Record<string, unknown>;
            confidence: number;
            subtype?: string | undefined;
            title?: string | undefined;
            evidence?: string[] | undefined;
            evidence_doc_ids?: string[] | undefined;
            tags?: string[] | undefined;
            filter?: import("@kbn/streamlang").Condition | undefined;
            meta?: Record<string, unknown> | undefined;
        } & {
            uuid: string;
            status: "active" | "expired" | "stale";
            last_seen: string;
            expires_at?: string | undefined;
            excluded_at?: string | undefined;
            run_id?: string | undefined;
        })[];
        computedFeaturesCount: number;
    }, undefined>;
    "POST /internal/streams/{streamName}/features/_identify/inferred": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/features/_identify/inferred", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            connectorId: z.ZodOptional<z.ZodString>;
            start: z.ZodOptional<z.ZodNumber>;
            end: z.ZodOptional<z.ZodNumber>;
            runId: z.ZodOptional<z.ZodString>;
            iteration: z.ZodOptional<z.ZodNumber>;
            featureTtlDays: z.ZodOptional<z.ZodNumber>;
            sampleSize: z.ZodOptional<z.ZodNumber>;
            entityFilteredRatio: z.ZodOptional<z.ZodNumber>;
            diverseRatio: z.ZodOptional<z.ZodNumber>;
            maxEntityFilters: z.ZodOptional<z.ZodNumber>;
            maxExcludedFeaturesInPrompt: z.ZodOptional<z.ZodNumber>;
            maxPreviouslyIdentifiedFeatures: z.ZodOptional<z.ZodNumber>;
            diverseOffset: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        connectorId: string;
        hasDocuments: boolean;
        docsCount: number;
        docIds: string[];
        discoveredFeatures: import("@kbn/streams-schema").Feature[];
        iterationResult: import("@kbn/streams-schema").IterationResult;
        nextDiverseOffset: number;
    }, undefined>;
};
