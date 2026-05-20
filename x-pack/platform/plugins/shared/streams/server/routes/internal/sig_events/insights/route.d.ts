import type { z } from '@kbn/zod/v4';
import type { TaskResult } from '@kbn/streams-schema';
import { type Insight } from '@kbn/streams-schema';
import type { InsightsDiscoveryTaskResult } from '../../../../lib/sig_events/tasks/insights_discovery';
export type InsightsTaskResult = TaskResult<InsightsDiscoveryTaskResult>;
export declare const internalInsightsRoutes: {
    "POST /internal/streams/_insights/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_insights/_bulk", z.ZodObject<{
        body: z.ZodObject<{
            operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                index: z.ZodIntersection<z.ZodObject<{
                    title: z.ZodString;
                    description: z.ZodString;
                    impact: z.ZodEnum<{
                        low: "low";
                        medium: "medium";
                        high: "high";
                        critical: "critical";
                    }>;
                    evidence: z.ZodArray<z.ZodObject<{
                        stream_name: z.ZodString;
                        query_title: z.ZodString;
                        event_count: z.ZodNumber;
                    }, z.core.$strip>>;
                    recommendations: z.ZodArray<z.ZodString>;
                }, z.core.$strip>, z.ZodObject<{
                    id: z.ZodString;
                    generated_at: z.ZodString;
                    impact_level: z.ZodNumber;
                    user_evaluation: z.ZodOptional<z.ZodEnum<{
                        helpful: "helpful";
                        not_helpful: "not_helpful";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                delete: z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "DELETE /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_insights/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "PUT /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_insights/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodIntersection<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodString;
            impact: z.ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>;
            evidence: z.ZodArray<z.ZodObject<{
                stream_name: z.ZodString;
                query_title: z.ZodString;
                event_count: z.ZodNumber;
            }, z.core.$strip>>;
            recommendations: z.ZodArray<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            impact_level: z.ZodNumber;
            generated_at: z.ZodString;
            user_evaluation: z.ZodOptional<z.ZodEnum<{
                helpful: "helpful";
                not_helpful: "not_helpful";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        insight: Insight;
    }, undefined>;
    "GET /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_insights/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        insight: Insight;
    }, undefined>;
    "GET /internal/streams/_insights": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_insights", z.ZodObject<{
        query: z.ZodObject<{
            impact: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>, z.ZodArray<z.ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        insights: Insight[];
        total: number;
    }, undefined>;
    "POST /internal/streams/_insights/_status": {
        endpoint: "POST /internal/streams/_insights/_status";
        handler: (options: import("../../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<InsightsTaskResult>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /internal/streams/_insights/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_insights/_task", z.ZodObject<{
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
            streamNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
            connectorId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, InsightsTaskResult, undefined>;
};
