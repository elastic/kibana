import { z } from '@kbn/zod/v4';
import { type IlmPolicyWithUsage } from '@kbn/streams-schema';
export declare const internalLifecycleRoutes: {
    "GET /internal/streams/lifecycle/_snapshot_repositories": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/lifecycle/_snapshot_repositories", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        repositories: Array<{
            name: string;
            type: string;
        }>;
    }, undefined>;
    "POST /internal/streams/lifecycle/_policy": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/lifecycle/_policy", z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            phases: z.ZodObject<{
                hot: z.ZodOptional<z.ZodObject<{
                    min_age: z.ZodOptional<z.ZodString>;
                    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, z.core.$loose>>;
                warm: z.ZodOptional<z.ZodObject<{
                    min_age: z.ZodOptional<z.ZodString>;
                    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, z.core.$loose>>;
                cold: z.ZodOptional<z.ZodObject<{
                    min_age: z.ZodOptional<z.ZodString>;
                    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, z.core.$loose>>;
                frozen: z.ZodOptional<z.ZodObject<{
                    min_age: z.ZodOptional<z.ZodString>;
                    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, z.core.$loose>>;
                delete: z.ZodOptional<z.ZodObject<{
                    min_age: z.ZodOptional<z.ZodString>;
                    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, z.core.$loose>>;
            }, z.core.$strip>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            deprecated: z.ZodOptional<z.ZodBoolean>;
            source_policy_name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        query: z.ZodObject<{
            allow_overwrite: z.ZodDefault<z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/lifecycle/_policies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/lifecycle/_policies", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, IlmPolicyWithUsage[], undefined>;
    "GET /internal/streams/{name}/lifecycle/_explain": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/lifecycle/_explain", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").IlmExplainLifecycleResponse, undefined>;
    "GET /internal/streams/{name}/lifecycle/_stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/lifecycle/_stats", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        phases: undefined;
        policy_missing: boolean;
    } | {
        phases: import("@kbn/streams-schema").IlmPolicyPhases;
        policy_missing: boolean;
    }, undefined>;
};
