import { type Verdict } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export declare const internalSigEventsVerdictsRoutes: {
    "POST /internal/sig_events/verdicts": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/verdicts", z.ZodObject<{
        body: z.ZodArray<z.ZodObject<{
            '@timestamp': z.ZodISODateTime;
            verdict: z.ZodString;
            verdict_id: z.ZodOptional<z.ZodString>;
            discovery_id: z.ZodString;
            discovery_slug: z.ZodString;
            rule_names: z.ZodArray<z.ZodString>;
            stream_names: z.ZodArray<z.ZodString>;
            title: z.ZodString;
            summary: z.ZodString;
            root_cause: z.ZodString;
            criticality: z.ZodNumber;
            confidence: z.ZodNumber;
            impact: z.ZodOptional<z.ZodString>;
            recommended_action: z.ZodOptional<z.ZodString>;
            recommendations: z.ZodOptional<z.ZodArray<z.ZodString>>;
            verdict_summary: z.ZodString;
            assessment_note: z.ZodOptional<z.ZodString>;
            conversation_id: z.ZodOptional<z.ZodString>;
            workflow_execution_id: z.ZodOptional<z.ZodString>;
            original_verdict: z.ZodOptional<z.ZodString>;
            verdict_source: z.ZodOptional<z.ZodString>;
            grouped_discovery_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
            grouped_into: z.ZodOptional<z.ZodString>;
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
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/verdicts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/verdicts", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodOptional<z.ZodISODateTime>;
            to: z.ZodOptional<z.ZodISODateTime>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        hits: Verdict[];
    }, undefined>;
};
