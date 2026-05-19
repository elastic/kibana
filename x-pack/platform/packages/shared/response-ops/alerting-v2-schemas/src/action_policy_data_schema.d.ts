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
}, z.core.$strip>], "type">;
export declare const groupingModeSchema: z.ZodEnum<{
    all: "all";
    per_episode: "per_episode";
    per_field: "per_field";
}>;
export type GroupingMode = z.infer<typeof groupingModeSchema>;
export declare const actionPolicyTypeSchema: z.ZodEnum<{
    global: "global";
    single_rule: "single_rule";
}>;
export type ActionPolicyType = z.infer<typeof actionPolicyTypeSchema>;
export declare const throttleStrategySchema: z.ZodEnum<{
    on_status_change: "on_status_change";
    per_status_interval: "per_status_interval";
    time_interval: "time_interval";
    every_time: "every_time";
}>;
export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;
export declare const needsInterval: (strategy: string | undefined) => boolean;
export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;
export declare const snoozeActionPolicyBodySchema: z.ZodObject<{
    snoozedUntil: z.ZodISODateTime;
}, z.core.$strip>;
export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;
export declare const actionPolicyBulkActionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"enable">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"disable">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"snooze">;
    snoozedUntil: z.ZodISODateTime;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"unsnooze">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"delete">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    action: z.ZodLiteral<"update_api_key">;
}, z.core.$strip>], "action">;
export type ActionPolicyBulkAction = z.infer<typeof actionPolicyBulkActionSchema>;
export declare const bulkActionActionPoliciesBodySchema: z.ZodObject<{
    actions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"enable">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"disable">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"snooze">;
        snoozedUntil: z.ZodISODateTime;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"unsnooze">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"delete">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        action: z.ZodLiteral<"update_api_key">;
    }, z.core.$strip>], "action">>;
}, z.core.$strip>;
export type BulkActionActionPoliciesBody = z.infer<typeof bulkActionActionPoliciesBodySchema>;
export declare const createActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        global: "global";
        single_rule: "single_rule";
    }>>;
    ruleId: z.ZodOptional<z.ZodString>;
    destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strip>], "type">>;
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;
export declare const updateActionPolicyDataSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strip>], "type">>>;
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
    }, z.core.$strip>>>;
}, z.core.$strict>;
export type UpdateActionPolicyData = z.infer<typeof updateActionPolicyDataSchema>;
export declare const updateActionPolicyBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    destinations: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strip>], "type">>>;
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
    }, z.core.$strip>>>;
    version: z.ZodString;
}, z.core.$strict>;
export type UpdateActionPolicyBody = z.infer<typeof updateActionPolicyBodySchema>;
