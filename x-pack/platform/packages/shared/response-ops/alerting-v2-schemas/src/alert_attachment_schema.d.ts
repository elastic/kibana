import { z } from '@kbn/zod/v4';
/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export declare const ALERT_ATTACHMENT_TYPE: 'platform.alerting.alert';
export declare const alertAttachmentDataSchema: z.ZodObject<{
    '@timestamp': z.ZodISODateTime;
    'alert.id': z.ZodString;
    'alert.label': z.ZodOptional<z.ZodString>;
    'alert.status': z.ZodUnion<readonly [z.ZodLiteral<"inactive">, z.ZodLiteral<"pending">, z.ZodLiteral<"active">, z.ZodLiteral<"recovering">]>;
    'rule.id': z.ZodString;
    group_hash: z.ZodString;
    first_timestamp: z.ZodISODateTime;
    last_timestamp: z.ZodISODateTime;
    duration: z.ZodNumber;
    triggered_at: z.ZodOptional<z.ZodISODateTime>;
    last_ack_action: z.ZodOptional<z.ZodEnum<{
        ack: "ack";
        unack: "unack";
    }>>;
    last_assignee_uid: z.ZodOptional<z.ZodString>;
    last_snooze_action: z.ZodOptional<z.ZodEnum<{
        snooze: "snooze";
        unsnooze: "unsnooze";
    }>>;
    snoozed_until: z.ZodOptional<z.ZodISODateTime>;
    last_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    alert_data: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type AlertAttachmentData = z.infer<typeof alertAttachmentDataSchema>;
