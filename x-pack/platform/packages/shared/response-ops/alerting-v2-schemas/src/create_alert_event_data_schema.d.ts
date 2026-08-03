import { z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from './alert_action_schema';
/**
 * HTTP edge only — POST /api/alerting/v2/alerts/:source request body.
 * `source` is supplied by the path; the route merges it before calling the client.
 * Do not use this type inward of the route layer.
 */
export declare const createAlertEventPathBodySchema: z.ZodObject<{
    fingerprint: z.ZodOptional<z.ZodString>;
    fingerprint_fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rule_id: z.ZodOptional<z.ZodString>;
    alert_status: z.ZodOptional<z.ZodEnum<{
        inactive: ALERT_EPISODE_STATUS.INACTIVE;
        pending: ALERT_EPISODE_STATUS.PENDING;
        active: ALERT_EPISODE_STATUS.ACTIVE;
        recovering: ALERT_EPISODE_STATUS.RECOVERING;
    }>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    timestamp: z.ZodOptional<z.ZodISODateTime>;
    severity: z.ZodOptional<z.ZodEnum<{
        info: "info";
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>>;
}, z.core.$strict>;
/**
 * Canonical create-alert payload (source required).
 * Also the POST /api/alerting/v2/alerts request body schema.
 * Prefer this type everywhere past the HTTP edge.
 */
export declare const createAlertEventDataSchema: z.ZodObject<{
    fingerprint: z.ZodOptional<z.ZodString>;
    fingerprint_fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rule_id: z.ZodOptional<z.ZodString>;
    alert_status: z.ZodOptional<z.ZodEnum<{
        inactive: ALERT_EPISODE_STATUS.INACTIVE;
        pending: ALERT_EPISODE_STATUS.PENDING;
        active: ALERT_EPISODE_STATUS.ACTIVE;
        recovering: ALERT_EPISODE_STATUS.RECOVERING;
    }>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    timestamp: z.ZodOptional<z.ZodISODateTime>;
    severity: z.ZodOptional<z.ZodEnum<{
        info: "info";
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>>;
    source: z.ZodString;
}, z.core.$strict>;
/** Path params for POST /api/alerting/v2/alerts/:source */
export declare const createAlertEventSourceParamsSchema: z.ZodObject<{
    source: z.ZodString;
}, z.core.$strip>;
export declare const createAlertEventResponseSchema: z.ZodObject<{
    group_hash: z.ZodString;
    episode_id: z.ZodString;
}, z.core.$strip>;
/** Normalized ingest payload — `source` is always present past the HTTP edge. */
export type CreateAlertEventData = z.infer<typeof createAlertEventDataSchema>;
export type CreateAlertEventResponse = z.infer<typeof createAlertEventResponseSchema>;
