import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { StreamQuery } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export interface ListQueriesResponse {
    queries: StreamQuery[];
}
export interface UpsertQueryResponse {
    acknowledged: boolean;
}
export interface DeleteQueryResponse {
    acknowledged: boolean;
}
export type BulkUpdateAssetsResponse = {
    acknowledged: boolean;
} | {
    errors: ErrorCause[];
};
export declare const queryRoutes: {
    "POST /api/streams/{name}/queries/_bulk 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/queries/_bulk 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                index: z.ZodObject<{
                    title: z.ZodString;
                    esql: z.ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, z.core.$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
                    severity_score: z.ZodOptional<z.ZodNumber>;
                    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    description: z.ZodDefault<z.ZodString>;
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                delete: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, BulkUpdateAssetsResponse, undefined>;
    "DELETE /api/streams/{name}/queries/{queryId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{name}/queries/{queryId} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
            queryId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, DeleteQueryResponse, undefined>;
    "PUT /api/streams/{name}/queries/{queryId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/queries/{queryId} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
            queryId: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            title: z.ZodString;
            esql: z.ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, z.core.$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
            severity_score: z.ZodOptional<z.ZodNumber>;
            evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
            description: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, UpsertQueryResponse, undefined>;
    "GET /api/streams/{name}/queries 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/queries 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, ListQueriesResponse, undefined>;
};
