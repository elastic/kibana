import { type Detection } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export declare const internalSigEventsDetectionsRoutes: {
    "POST /internal/sig_events/detections": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/detections", z.ZodObject<{
        body: z.ZodArray<z.ZodObject<{
            '@timestamp': z.ZodISODateTime;
            silent: z.ZodBoolean;
            processed: z.ZodBoolean;
            detection_id: z.ZodOptional<z.ZodString>;
            rule_uuid: z.ZodString;
            rule_name: z.ZodString;
            stream_name: z.ZodOptional<z.ZodString>;
            alert_count: z.ZodOptional<z.ZodNumber>;
            alert_index: z.ZodOptional<z.ZodString>;
            workflow_execution_id: z.ZodOptional<z.ZodString>;
            resolution_lookback_minutes: z.ZodOptional<z.ZodNumber>;
            peak_30m_alert_count: z.ZodOptional<z.ZodNumber>;
            detection_evidence: z.ZodOptional<z.ZodObject<{
                change_point_type: z.ZodOptional<z.ZodString>;
                p_value: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            alert_samples: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
            rules_activity: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/detections": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/detections", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodOptional<z.ZodISODateTime>;
            to: z.ZodOptional<z.ZodISODateTime>;
            rule_uuid: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>, z.ZodArray<z.ZodString>]>>;
            rule_name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        hits: Detection[];
    }, undefined>;
};
