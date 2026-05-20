import type { z } from '@kbn/zod/v4';
export declare const ACTION_POLICY_ATTACHMENT_TYPE: "action_policy";
export declare const ACTION_POLICY_SML_TYPE: "alerting_v2_action_policy";
/**
 * Data stored inside an action policy attachment.
 *
 * Picks only the fields meaningful inside the attachment:
 *  - User-editable policy attributes (mirrors createActionPolicyData)
 *  - Minimal server-managed fields the attachment actually consumes:
 *      id           — identity for saved policies
 *      version      — optimistic concurrency on canvas updates
 *      enabled      — status badge in formatActionPolicyDescription
 *      snoozedUntil — display
 *      updatedAt    — staleness check against origin_snapshot_at
 *
 * All fields are optional so the same schema covers both:
 *  - proposed policies (by-value, built incrementally by manage_action_policy)
 *  - saved policies    (by-reference, snapshotted from the API response)
 *
 * Audit/identity metadata (auth, createdBy*, updatedBy*, createdAt) is
 * intentionally excluded — nothing on the attachment side reads it, and we
 * don't want per-user identity baked into a conversation attachment.
 */
export declare const actionPolicyAttachmentDataSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        global: "global";
        single_rule: "single_rule";
    }>>;
    id: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    version: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodString>;
    throttle: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodEnum<{
            on_status_change: "on_status_change";
            per_status_interval: "per_status_interval";
            time_interval: "time_interval";
            every_time: "every_time";
        }>>;
        interval: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
    ruleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    groupBy: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    snoozedUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strip>], "type">>>;
    matcher: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    groupingMode: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        all: "all";
        per_episode: "per_episode";
        per_field: "per_field";
    }>>>;
}, z.core.$strip>;
export type ActionPolicyAttachmentData = z.infer<typeof actionPolicyAttachmentDataSchema>;
