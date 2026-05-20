import { z } from '@kbn/zod/v4';
export declare const detectionSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type Detection = z.infer<typeof detectionSchema>;
