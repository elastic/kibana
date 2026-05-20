import { z } from '@kbn/zod/v4';
export declare const actionPolicyResponseSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<{
        global: "global";
        single_rule: "single_rule";
    }>;
    ruleId: z.ZodNullable<z.ZodString>;
    enabled: z.ZodBoolean;
    destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"workflow">;
        id: z.ZodString;
    }, z.core.$strip>], "type">>;
    matcher: z.ZodNullable<z.ZodString>;
    groupBy: z.ZodNullable<z.ZodArray<z.ZodString>>;
    tags: z.ZodNullable<z.ZodArray<z.ZodString>>;
    groupingMode: z.ZodNullable<z.ZodEnum<{
        all: "all";
        per_episode: "per_episode";
        per_field: "per_field";
    }>>;
    throttle: z.ZodNullable<z.ZodObject<{
        strategy: z.ZodOptional<z.ZodEnum<{
            on_status_change: "on_status_change";
            per_status_interval: "per_status_interval";
            time_interval: "time_interval";
            every_time: "every_time";
        }>>;
        interval: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    snoozedUntil: z.ZodNullable<z.ZodString>;
    auth: z.ZodObject<{
        owner: z.ZodString;
        createdByUser: z.ZodBoolean;
    }, z.core.$strip>;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedBy: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ActionPolicyResponse = z.infer<typeof actionPolicyResponseSchema>;
export declare const findActionPoliciesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodString;
        type: z.ZodEnum<{
            global: "global";
            single_rule: "single_rule";
        }>;
        ruleId: z.ZodNullable<z.ZodString>;
        enabled: z.ZodBoolean;
        destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"workflow">;
            id: z.ZodString;
        }, z.core.$strip>], "type">>;
        matcher: z.ZodNullable<z.ZodString>;
        groupBy: z.ZodNullable<z.ZodArray<z.ZodString>>;
        tags: z.ZodNullable<z.ZodArray<z.ZodString>>;
        groupingMode: z.ZodNullable<z.ZodEnum<{
            all: "all";
            per_episode: "per_episode";
            per_field: "per_field";
        }>>;
        throttle: z.ZodNullable<z.ZodObject<{
            strategy: z.ZodOptional<z.ZodEnum<{
                on_status_change: "on_status_change";
                per_status_interval: "per_status_interval";
                time_interval: "time_interval";
                every_time: "every_time";
            }>>;
            interval: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        snoozedUntil: z.ZodNullable<z.ZodString>;
        auth: z.ZodObject<{
            owner: z.ZodString;
            createdByUser: z.ZodBoolean;
        }, z.core.$strip>;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedBy: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
}, z.core.$strip>;
export type FindActionPoliciesResponse = z.infer<typeof findActionPoliciesResponseSchema>;
export declare const bulkActionActionPoliciesResponseSchema: z.ZodObject<{
    processed: z.ZodNumber;
    total: z.ZodNumber;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BulkActionActionPoliciesResponse = z.infer<typeof bulkActionActionPoliciesResponseSchema>;
