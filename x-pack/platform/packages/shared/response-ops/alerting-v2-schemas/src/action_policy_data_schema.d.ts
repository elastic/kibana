import { z } from '@kbn/zod/v4';
/**
 * The set of supported action policy destination types. Single source of truth
 * for the destination discriminator and any filter that targets destination type.
 */
export declare const actionPolicyDestinationTypeSchema: z.ZodEnum<{
    workflow: "workflow";
}>;
export type ActionPolicyDestinationType = z.infer<typeof actionPolicyDestinationTypeSchema>;
export declare const actionPolicyDestinationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"workflow">;
    id: z.ZodString;
}, z.core.$strict>], "type">;
export declare const groupingModeSchema: z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>;
export type GroupingMode = z.infer<typeof groupingModeSchema>;
export declare const throttleStrategySchema: z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>;
export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;
export declare const PER_ALERT_STRATEGIES: Set<string>;
export declare const AGGREGATE_STRATEGIES: Set<string>;
export declare const STRATEGIES_REQUIRING_INTERVAL: Set<string>;
export declare const needsInterval: (strategy: string | undefined) => boolean;
export interface ValidationPayload {
    value: {
        grouping_mode?: string | null;
        throttle?: {
            strategy?: string;
            interval?: string | null;
        } | null;
    };
    issues: z.core.$ZodRawIssue[];
}
export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;
export declare const snoozeActionPolicyBodySchema: z.ZodObject<{
    snoozed_until: z.ZodISODateTime;
}, z.core.$strict>;
export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;
/**
 * Request body for `POST /action_policies/_bulk_snooze`. Reuses the shared
 * by-ID bulk body (`ids`, 1..MAX_BULK_ITEMS) and adds the snooze expiry so
 * every action policy in the batch is snoozed until the same instant.
 */
export declare const bulkSnoozeActionPoliciesBodySchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
    snoozed_until: z.ZodISODateTime;
}, z.core.$strict>;
export type BulkSnoozeActionPoliciesBody = z.infer<typeof bulkSnoozeActionPoliciesBodySchema>;
export declare const createActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>;
    matcher: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    group_by: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grouping_mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>;
    throttle: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;
/**
 * Request body schema for `PUT /api/alerting/v2/action_policies/{id}`. Adds
 * an optional `enabled` on top of the create-action-policy data. Left as a
 * plain optional (no schema-level default) because the meaning of "omitted"
 * differs by outcome: on create it defaults to `true`, on replace it
 * preserves the existing stored value — both handled in application code,
 * not here.
 */
export declare const putActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>;
    matcher: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    group_by: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grouping_mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>;
    throttle: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type PutActionPolicyData = z.infer<typeof putActionPolicyDataSchema>;
export type PutActionPolicyDataInput = z.input<typeof putActionPolicyDataSchema>;
export declare const updateActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>>;
    matcher: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    group_by: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    grouping_mode: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>>;
    throttle: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type UpdateActionPolicyData = z.infer<typeof updateActionPolicyDataSchema>;
/** Sort field for the find action policies (list) API. */
export declare const findActionPoliciesSortFieldSchema: z.ZodEnum<{
    created_at: "created_at";
    name: "name";
    updated_at: "updated_at";
}>;
export type FindActionPoliciesSortField = z.infer<typeof findActionPoliciesSortFieldSchema>;
/** Query parameters for the find action policies (list) API. */
export declare const findActionPoliciesRequestSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    filter: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        created_at: "created_at";
        name: "name";
        updated_at: "updated_at";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strict>;
export type FindActionPoliciesRequest = z.infer<typeof findActionPoliciesRequestSchema>;
