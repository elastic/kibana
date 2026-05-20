import { z } from '@kbn/zod/v4';
import type { TaskResult } from '@kbn/streams-schema';
import type { MemoryEntry, MemoryCategoryNode, MemorySearchResult, MemoryVersionRecord } from '../../../lib/memory';
import { type ConversationScraperTaskResult } from '../../../lib/tasks/task_definitions/conversation_scraper';
import { type MemoryConsolidationTaskResult } from '../../../lib/tasks/task_definitions/memory_consolidation';
import type { MemoryGenerationResult } from '../../../lib/sig_events/memory_generation';
export declare const internalMemoryRoutes: {
    "POST /internal/streams/{streamName}/memory/_generate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/memory/_generate", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            features: z.ZodOptional<z.ZodArray<z.ZodIntersection<z.ZodObject<{
                id: z.ZodString;
                stream_name: z.ZodString;
                type: z.ZodString;
                subtype: z.ZodOptional<z.ZodString>;
                title: z.ZodOptional<z.ZodString>;
                description: z.ZodString;
                properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                confidence: z.ZodNumber;
                evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
                evidence_doc_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
                tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
                filter: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
                meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.core.$strip>, z.ZodObject<{
                uuid: z.ZodString;
                status: z.ZodEnum<{
                    active: "active";
                    expired: "expired";
                    stale: "stale";
                }>;
                last_seen: z.ZodString;
                expires_at: z.ZodOptional<z.ZodString>;
                excluded_at: z.ZodOptional<z.ZodString>;
                run_id: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>>;
            queries: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<{
                    stats: "stats";
                    match: "match";
                }>;
                title: z.ZodString;
                esql: z.ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, z.core.$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
                severity_score: z.ZodNumber;
                description: z.ZodString;
                evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
                replaces: z.ZodOptional<z.ZodString>;
                features: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    run_id: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryGenerationResult & {
        skipped?: boolean;
        reason?: string;
        connectorId?: string;
    }, undefined>;
    "POST /internal/streams/memory/_consolidate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/_consolidate", z.ZodObject<{
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, TaskResult<MemoryConsolidationTaskResult>, undefined>;
    "POST /internal/streams/memory/_scrape_conversations": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/_scrape_conversations", z.ZodObject<{
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, TaskResult<ConversationScraperTaskResult>, undefined>;
    "GET /internal/streams/memory/recent-changes": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/recent-changes", z.ZodObject<{
        query: z.ZodDefault<z.ZodOptional<z.ZodObject<{
            size: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        changes: MemoryVersionRecord[];
    }, undefined>;
    "GET /internal/streams/memory/entries/{id}/history/{version}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}/history/{version}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryVersionRecord, undefined>;
    "GET /internal/streams/memory/entries/{id}/history": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}/history", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodDefault<z.ZodOptional<z.ZodObject<{
            size: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        history: MemoryVersionRecord[];
    }, undefined>;
    "GET /internal/streams/memory/categories": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/categories", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        tree: MemoryCategoryNode[];
    }, undefined>;
    "POST /internal/streams/memory/search": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/search", z.ZodObject<{
        body: z.ZodObject<{
            query: z.ZodString;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
            references: z.ZodOptional<z.ZodArray<z.ZodString>>;
            size: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        results: MemorySearchResult[];
    }, undefined>;
    "POST /internal/streams/memory/entries/{id}/rename": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/entries/{id}/rename", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            new_name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryEntry, undefined>;
    "DELETE /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/memory/entries/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        deleted: boolean;
    }, undefined>;
    "PUT /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/memory/entries/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
            references: z.ZodOptional<z.ZodArray<z.ZodString>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            change_summary: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryEntry, undefined>;
    "GET /internal/streams/memory/entries/by-name": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/by-name", z.ZodObject<{
        query: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryEntry, undefined>;
    "GET /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryEntry, undefined>;
    "POST /internal/streams/memory/entries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/entries", z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            title: z.ZodString;
            content: z.ZodString;
            categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
            references: z.ZodOptional<z.ZodArray<z.ZodString>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, MemoryEntry, undefined>;
};
