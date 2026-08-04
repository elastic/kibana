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
export declare const groupingModeSchema: z.ZodEnum<{
    all: "all";
    per_episode: "per_episode";
    per_field: "per_field";
}>;
export type GroupingMode = z.infer<typeof groupingModeSchema>;
export declare const throttleStrategySchema: z.ZodEnum<{
    on_status_change: "on_status_change";
    per_status_interval: "per_status_interval";
    time_interval: "time_interval";
    every_time: "every_time";
}>;
export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;
export declare const PER_EPISODE_STRATEGIES: Set<string>;
export declare const AGGREGATE_STRATEGIES: Set<string>;
export declare const STRATEGIES_REQUIRING_INTERVAL: Set<string>;
export declare const needsInterval: (strategy: string | undefined) => boolean;
export interface ValidationPayload {
    value: {
        groupingMode?: string | null;
        throttle?: {
            strategy?: string;
            interval?: string | null;
        } | null;
    };
    issues: z.core.$ZodRawIssue[];
}
export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;
export declare const snoozeActionPolicyBodySchema: z.ZodObject<{
    snoozedUntil: z.ZodISODateTime;
}, z.core.$strict>;
export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;
/**
 * Request body for `POST /action_policies/_bulk_snooze`. Reuses the shared
 * by-ID bulk body (`ids`, 1..MAX_BULK_ITEMS) and adds the snooze expiry so
 * every action policy in the batch is snoozed until the same instant.
 */
export declare const bulkSnoozeActionPoliciesBodySchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
    snoozedUntil: z.ZodISODateTime;
}, z.core.$strict>;
export type BulkSnoozeActionPoliciesBody = z.infer<typeof bulkSnoozeActionPoliciesBodySchema>;
export declare const createActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>;
    matcher: z.ZodOptional<z.ZodString>;
    groupBy: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    groupingMode: z.ZodOptional<z.ZodEnum<{
        all: "all";
        per_episode: "per_episode";
        per_field: "per_field";
    }>>;
    throttle: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodEnum<{
            on_status_change: "on_status_change";
            per_status_interval: "per_status_interval";
            time_interval: "time_interval";
            every_time: "every_time";
        }>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;
export declare const updateActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>>;
    matcher: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    groupBy: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    groupingMode: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        all: "all";
        per_episode: "per_episode";
        per_field: "per_field";
    }>>>;
    throttle: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodEnum<{
            on_status_change: "on_status_change";
            per_status_interval: "per_status_interval";
            time_interval: "time_interval";
            every_time: "every_time";
        }>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type UpdateActionPolicyData = z.infer<typeof updateActionPolicyDataSchema>;
export declare const updateActionPolicyBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strict>], "type">>>;
    matcher: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    groupBy: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    groupingMode: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        all: "all";
        per_episode: "per_episode";
        per_field: "per_field";
    }>>>;
    throttle: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodEnum<{
            on_status_change: "on_status_change";
            per_status_interval: "per_status_interval";
            time_interval: "time_interval";
            every_time: "every_time";
        }>>;
        interval: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>>;
    version: z.ZodString;
}, z.core.$strict>;
export type UpdateActionPolicyBody = z.infer<typeof updateActionPolicyBodySchema>;
/** Sort field for the find action policies (list) API. */
export declare const findActionPoliciesSortFieldSchema: z.ZodEnum<{
    name: "name";
    createdAt: "createdAt";
    updatedAt: "updatedAt";
}>;
export type FindActionPoliciesSortField = z.infer<typeof findActionPoliciesSortFieldSchema>;
/** Query parameters for the find action policies (list) API. */
export declare const findActionPoliciesRequestSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    per_page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    search: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>, z.ZodArray<z.ZodString>>>;
    enabled: z.ZodOptional<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        name: "name";
        createdAt: "createdAt";
        updatedAt: "updatedAt";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export type FindActionPoliciesRequest = z.infer<typeof findActionPoliciesRequestSchema>;
