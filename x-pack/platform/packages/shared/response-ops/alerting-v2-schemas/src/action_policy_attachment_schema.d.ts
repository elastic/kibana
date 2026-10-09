import type { z } from '@kbn/zod/v4';
/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export declare const ACTION_POLICY_ATTACHMENT_TYPE: 'platform.alerting.action_policy';
/**
 * Data stored inside an action policy attachment.
 *
 * Picks only the fields meaningful inside the attachment:
 *  - User-editable policy attributes (mirrors createActionPolicyData)
 *  - Minimal server-managed fields the attachment actually consumes:
 *      id           — identity for saved policies
 *      enabled      — status badge in formatActionPolicyDescription
 *      snoozed_until — display
 *      updated_at    — staleness check against origin_snapshot_at
 *
 * All fields are optional so the same schema covers both:
 *  - proposed policies (by-value, built incrementally by manage_action_policy)
 *  - saved policies    (by-reference, snapshotted from the API response)
 *
 * Audit/identity metadata (auth, created_by*, updated_by*, created_at) is
 * intentionally excluded — nothing on the attachment side reads it, and we
 * don't want per-user identity baked into a conversation attachment.
 */
export declare const actionPolicyAttachmentDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>>;
    matcher: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    group_by: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    grouping_mode: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>>;
    throttle: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
        interval: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
    snoozed_until: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_at: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>;
export type ActionPolicyAttachmentData = z.infer<typeof actionPolicyAttachmentDataSchema>;
