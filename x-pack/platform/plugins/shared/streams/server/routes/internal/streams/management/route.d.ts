export declare const internalManagementRoutes: {
    "POST /internal/streams/{name}/_restore_data_stream": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_restore_data_stream", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
    "GET /internal/streams/{name}/_store_stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_store_stats", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, import("./store_stats_route").StreamStoreStat, undefined>;
    "POST /internal/streams/{name}/_suggest_processing_pipeline": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_processing_pipeline", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            documents: import("zod").ZodArray<import("zod").ZodType<import("@kbn/streams-schema").FlattenRecord, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").FlattenRecord, unknown>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, import("rxjs").Observable<{
        pipeline: import("@kbn/streams-ai").SuggestProcessingPipelineResult["pipeline"];
    } & {
        type: "suggested_processing_pipeline";
    }>, undefined>;
    "POST /internal/streams/{name}/_suggest_partitions": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_partitions", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            start: import("zod").ZodNumber;
            end: import("zod").ZodNumber;
            user_prompt: import("zod").ZodOptional<import("zod").ZodString>;
            existing_partitions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodString;
                condition: import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
            }, import("zod/v4/core").$strip>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, import("rxjs").Observable<import("@kbn/streams-ai/workflows/partition_stream").PartitionStreamResponse & {
        type: "suggested_partitions";
    }>, undefined>;
    "POST /internal/streams/{name}/_suggest_description": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_description", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            start: import("zod").ZodNumber;
            end: import("zod").ZodNumber;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, {
        description: string;
    }, undefined>;
    "GET /internal/streams/{name}/_unmanaged_assets": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_unmanaged_assets", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("../../../types").StreamsRouteHandlerResources, import("../../../../lib/streams/stream_crud").UnmanagedElasticsearchAssetDetails, undefined>;
};
