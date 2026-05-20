import { type Discovery } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
export declare const internalSigEventsDiscoveriesRoutes: {
    "POST /internal/sig_events/discoveries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/discoveries", z.ZodObject<{
        body: z.ZodArray<z.ZodObject<{
            '@timestamp': z.ZodISODateTime;
            kind: z.ZodString;
            discovery_id: z.ZodString;
            discovery_slug: z.ZodString;
            rule_names: z.ZodArray<z.ZodString>;
            stream_names: z.ZodArray<z.ZodString>;
            title: z.ZodString;
            summary: z.ZodString;
            root_cause: z.ZodString;
            criticality: z.ZodNumber;
            confidence: z.ZodNumber;
            impact: z.ZodString;
            detections: z.ZodArray<z.ZodObject<{
                detection_id: z.ZodOptional<z.ZodString>;
                rule_name: z.ZodOptional<z.ZodString>;
                rule_uuid: z.ZodOptional<z.ZodString>;
                stream_name: z.ZodOptional<z.ZodString>;
                change_point_type: z.ZodOptional<z.ZodString>;
                event_count: z.ZodOptional<z.ZodNumber>;
                detected_at: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            dependency_edges: z.ZodOptional<z.ZodArray<z.ZodObject<{
                source: z.ZodString;
                target: z.ZodString;
                protocol: z.ZodOptional<z.ZodString>;
                exposure: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            infra_components: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                workloads: z.ZodOptional<z.ZodArray<z.ZodString>>;
                exposure: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            cause_kis: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodOptional<z.ZodString>;
                stream_name: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            evidences: z.ZodOptional<z.ZodArray<z.ZodObject<{
                rule_name: z.ZodOptional<z.ZodString>;
                result: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                stream_name: z.ZodOptional<z.ZodString>;
                row_count: z.ZodOptional<z.ZodNumber>;
                collected_at: z.ZodOptional<z.ZodString>;
                esql_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                confirmed: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            closes: z.ZodOptional<z.ZodString>;
            grouped_into: z.ZodOptional<z.ZodString>;
            grouped_discovery_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
            grouping_rationale: z.ZodOptional<z.ZodString>;
            previous_discovery_id: z.ZodOptional<z.ZodString>;
            change_point_occurrence: z.ZodOptional<z.ZodString>;
            workflow_execution_id: z.ZodOptional<z.ZodString>;
            conversation_id: z.ZodOptional<z.ZodString>;
            closed_by_execution_id: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/discoveries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/discoveries", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodOptional<z.ZodISODateTime>;
            to: z.ZodOptional<z.ZodISODateTime>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        hits: Discovery[];
    }, undefined>;
};
