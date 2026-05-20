import type { z } from '@kbn/zod/v4';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { type Feature } from '@kbn/streams-schema';
export type FeaturesIdentificationTaskResult = TaskResult<IdentifyFeaturesResult>;
export declare const upsertFeatureRoute: Record<"POST /internal/streams/{name}/features", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodIntersection<z.ZodObject<{
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
        uuid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    acknowledged: boolean;
}, undefined>>;
export declare const deleteFeatureRoute: Record<"DELETE /internal/streams/{name}/features/{uuid}", import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/{name}/features/{uuid}", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
        uuid: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    acknowledged: boolean;
}, undefined>>;
export declare const listFeaturesRoute: Record<"GET /internal/streams/{name}/features", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    query: z.ZodOptional<z.ZodObject<{
        query: z.ZodOptional<z.ZodString>;
        search_mode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
            keyword: "keyword";
            semantic: "semantic";
            hybrid: "hybrid";
        }>>>;
        include_excluded: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
            true: "true";
            false: "false";
        }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
    }, z.core.$strip>>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    features: Feature[];
}, undefined>>;
export declare const listAllFeaturesRoute: Record<"GET /internal/streams/_features", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_features", z.ZodObject<{
    query: z.ZodOptional<z.ZodObject<{
        query: z.ZodOptional<z.ZodString>;
        search_mode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
            keyword: "keyword";
            semantic: "semantic";
            hybrid: "hybrid";
        }>>>;
        include_excluded: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
            true: "true";
            false: "false";
        }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
    }, z.core.$strip>>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    features: Feature[];
}, undefined>>;
export declare const bulkFeaturesRoute: Record<"POST /internal/streams/{name}/features/_bulk", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_bulk", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            index: z.ZodObject<{
                feature: z.ZodIntersection<z.ZodObject<{
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
                }, z.core.$strip>>;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            delete: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            exclude: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            restore: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    acknowledged: boolean;
}, undefined>>;
export declare const bulkFeaturesAcrossStreamsRoute: Record<"POST /internal/streams/features/_bulk", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/features/_bulk", z.ZodObject<{
    body: z.ZodObject<{
        operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            delete: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            exclude: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodObject<{
            restore: z.ZodObject<{
                id: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    succeeded: number;
    failed: number;
    skipped: number;
}, undefined>>;
export declare const featuresStatusRoute: Record<"GET /internal/streams/{name}/features/_status", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features/_status", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FeaturesIdentificationTaskResult, undefined>>;
export declare const featuresTaskRoute: Record<"POST /internal/streams/{name}/features/_task", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_task", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        action: z.ZodLiteral<"schedule">;
        from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
        to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"cancel">;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"acknowledge">;
    }, z.core.$strip>], "action">;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FeaturesIdentificationTaskResult, undefined>>;
export declare const featureRoutes: {
    "POST /internal/streams/{name}/features/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_task", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FeaturesIdentificationTaskResult, undefined>;
    "GET /internal/streams/{name}/features/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features/_status", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FeaturesIdentificationTaskResult, undefined>;
    "POST /internal/streams/features/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/features/_bulk", z.ZodObject<{
        body: z.ZodObject<{
            operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                delete: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                exclude: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                restore: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        succeeded: number;
        failed: number;
        skipped: number;
    }, undefined>;
    "POST /internal/streams/{name}/features/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_bulk", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                index: z.ZodObject<{
                    feature: z.ZodIntersection<z.ZodObject<{
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
                    }, z.core.$strip>>;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                delete: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                exclude: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                restore: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/_features": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_features", z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodOptional<z.ZodString>;
            search_mode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>>;
            include_excluded: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        features: Feature[];
    }, undefined>;
    "GET /internal/streams/{name}/features": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodOptional<z.ZodString>;
            search_mode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>>;
            include_excluded: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        features: Feature[];
    }, undefined>;
    "DELETE /internal/streams/{name}/features/{uuid}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/{name}/features/{uuid}", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
            uuid: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "POST /internal/streams/{name}/features": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodIntersection<z.ZodObject<{
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
            uuid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
};
