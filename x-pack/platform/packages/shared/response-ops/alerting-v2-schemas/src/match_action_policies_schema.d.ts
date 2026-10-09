import { z } from '@kbn/zod/v4';
export declare const matchActionPoliciesBodySchema: z.ZodObject<{
    rule: z.ZodOptional<z.ZodObject<{
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type MatchActionPoliciesBody = z.infer<typeof matchActionPoliciesBodySchema>;
export declare const matchedActionPolicyCategorySchema: z.ZodEnum<{
    catch_all: "catch_all";
    tags: "tags";
}>;
export type MatchedActionPolicyCategory = z.infer<typeof matchedActionPolicyCategorySchema>;
export declare const matchedActionPolicySchema: z.ZodObject<{
    action_policy: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        enabled: z.ZodBoolean;
        destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"workflow">;
            id: z.ZodString;
        }, z.core.$strict>], "type">>;
        matcher: z.ZodNullable<z.ZodObject<{
            tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
            expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        group_by: z.ZodNullable<z.ZodArray<z.ZodString>>;
        grouping_mode: z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>;
        throttle: z.ZodNullable<z.ZodObject<{
            strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
            interval: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        snoozed_until: z.ZodNullable<z.ZodString>;
        created_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        created_at: z.ZodISODateTime;
        updated_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodISODateTime;
    }, z.core.$strip>;
    category: z.ZodEnum<{
        catch_all: "catch_all";
        tags: "tags";
    }>;
}, z.core.$strip>;
export type MatchedActionPolicy = z.infer<typeof matchedActionPolicySchema>;
export declare const matchActionPoliciesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        action_policy: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            enabled: z.ZodBoolean;
            destinations: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                type: z.ZodLiteral<"workflow">;
                id: z.ZodString;
            }, z.core.$strict>], "type">>;
            matcher: z.ZodNullable<z.ZodObject<{
                tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
                expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>>;
            group_by: z.ZodNullable<z.ZodArray<z.ZodString>>;
            grouping_mode: z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"per_alert">, z.ZodLiteral<"all">, z.ZodLiteral<"per_field">]>>;
            throttle: z.ZodNullable<z.ZodObject<{
                strategy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"on_status_change">, z.ZodLiteral<"per_status_interval">, z.ZodLiteral<"time_interval">, z.ZodLiteral<"every_time">]>>;
                interval: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            snoozed_until: z.ZodNullable<z.ZodString>;
            created_by: z.ZodNullable<z.ZodObject<{
                profile_uid: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            created_at: z.ZodISODateTime;
            updated_by: z.ZodNullable<z.ZodObject<{
                profile_uid: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            updated_at: z.ZodISODateTime;
        }, z.core.$strip>;
        category: z.ZodEnum<{
            catch_all: "catch_all";
            tags: "tags";
        }>;
    }, z.core.$strip>>;
    evaluated_count: z.ZodNumber;
    is_truncated: z.ZodBoolean;
}, z.core.$strip>;
export type MatchActionPoliciesResponse = z.infer<typeof matchActionPoliciesResponseSchema>;
