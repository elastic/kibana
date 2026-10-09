import { z } from '@kbn/zod/v4';
/**
 * Used as the input schema for the `alerting.create_alert` workflow step.
 */
export declare const createAlertEventDataSchema: z.ZodObject<{
    fingerprint: z.ZodOptional<z.ZodString>;
    fingerprint_fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rule_id: z.ZodOptional<z.ZodString>;
    alert_status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
        pending: "pending";
        recovering: "recovering";
    }>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    timestamp: z.ZodOptional<z.ZodISODateTime>;
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        info: "info";
        low: "low";
        medium: "medium";
    }>>;
    source: z.ZodString;
}, z.core.$strict>;
export declare const createAlertEventResponseSchema: z.ZodObject<{
    group_hash: z.ZodString;
    alert_id: z.ZodString;
}, z.core.$strip>;
/** Normalized ingest payload — `source` is always present past the HTTP edge. */
export type CreateAlertEventData = z.infer<typeof createAlertEventDataSchema>;
export type CreateAlertEventResponse = z.infer<typeof createAlertEventResponseSchema>;
