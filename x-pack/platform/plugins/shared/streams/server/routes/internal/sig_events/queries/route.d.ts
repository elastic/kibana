import { z } from '@kbn/zod/v4';
import type { QueriesGetResponse, QueriesOccurrencesGetResponse, SignificantEventsQueriesGenerationResult } from '@kbn/streams-schema';
import type { PersistQueriesResult } from '../../../../lib/sig_events/persist_queries';
/**
 * Promotes unbacked queries to rule-backed status. Returns
 * `{ promoted, skipped_stats }`. Since STATS queries are filtered at
 * candidate selection (see `QueryClient.promoteUnbackedQueries`),
 * `skipped_stats` is reliably `0` on this route and is retained only for
 * response-shape stability.
 */
export declare const promoteUnbackedQueriesRoute: Record<"POST /internal/streams/queries/_promote", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_promote", z.ZodObject<{
    body: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        queryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        minSeverityScore: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    promoted: number;
    skipped_stats: number;
}, undefined>>;
export declare const demoteBackedQueriesRoute: Record<"POST /internal/streams/queries/_demote", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_demote", z.ZodObject<{
    body: z.ZodObject<{
        queryIds: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    demoted: number;
}, undefined>>;
export declare const bulkDeleteQueriesRoute: Record<"POST /internal/streams/queries/_bulk_delete", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_bulk_delete", z.ZodObject<{
    body: z.ZodObject<{
        queryIds: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    succeeded: number;
    failed: number;
    skipped: number;
}, undefined>>;
export declare const internalQueriesRoutes: {
    "POST /internal/streams/{streamName}/queries/_persist": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/queries/_persist", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            queries: z.ZodArray<z.ZodObject<{
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
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, PersistQueriesResult, undefined>;
    "POST /internal/streams/{streamName}/queries/_generate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/queries/_generate", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            connectorId: z.ZodOptional<z.ZodString>;
            maxExistingQueriesForContext: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsQueriesGenerationResult & {
        connectorId: string;
    }, undefined>;
    "GET /internal/streams/_queries/_occurrences": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_queries/_occurrences", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            bucketSize: z.ZodString;
            query: z.ZodOptional<z.ZodString>;
            streamNames: z.ZodOptional<z.ZodPreprocess<z.ZodArray<z.ZodString>>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, QueriesOccurrencesGetResponse, undefined>;
    "GET /internal/streams/_queries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_queries", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            bucketSize: z.ZodString;
            query: z.ZodOptional<z.ZodString>;
            streamNames: z.ZodOptional<z.ZodPreprocess<z.ZodArray<z.ZodString>>>;
            searchMode: z.ZodOptional<z.ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
            page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            status: z.ZodOptional<z.ZodPreprocess<z.ZodArray<z.ZodEnum<{
                active: "active";
                draft: "draft";
            }>>>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, QueriesGetResponse, undefined>;
    "POST /internal/streams/queries/_bulk_delete": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_bulk_delete", z.ZodObject<{
        body: z.ZodObject<{
            queryIds: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        succeeded: number;
        failed: number;
        skipped: number;
    }, undefined>;
    "POST /internal/streams/queries/_demote": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_demote", z.ZodObject<{
        body: z.ZodObject<{
            queryIds: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        demoted: number;
    }, undefined>;
    "POST /internal/streams/queries/_promote": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_promote", z.ZodObject<{
        body: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            queryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
            minSeverityScore: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        promoted: number;
        skipped_stats: number;
    }, undefined>;
};
