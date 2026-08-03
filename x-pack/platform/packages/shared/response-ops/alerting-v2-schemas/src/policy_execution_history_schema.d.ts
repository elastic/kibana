import { z } from '@kbn/zod/v4';
export declare const policyExecutionOutcomeSchema: z.ZodEnum<{
    throttled: "throttled";
    dispatched: "dispatched";
}>;
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;
export declare const policyExecutionOutcomeFilterSchema: z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
    throttled: "throttled";
    dispatched: "dispatched";
}>, z.ZodArray<z.ZodEnum<{
    throttled: "throttled";
    dispatched: "dispatched";
}>>]>, z.ZodTransform<("throttled" | "dispatched")[], "throttled" | "dispatched" | ("throttled" | "dispatched")[]>>;
export type PolicyExecutionOutcomeFilter = z.infer<typeof policyExecutionOutcomeFilterSchema>;
export declare const listPolicyExecutionHistoryRequestSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    rule_ids: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    outcome: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        throttled: "throttled";
        dispatched: "dispatched";
    }>, z.ZodArray<z.ZodEnum<{
        throttled: "throttled";
        dispatched: "dispatched";
    }>>]>, z.ZodTransform<("throttled" | "dispatched")[], "throttled" | "dispatched" | ("throttled" | "dispatched")[]>>>;
    page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    start_date: z.ZodOptional<z.ZodISODateTime>;
    episode_ids: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
}, z.core.$strip>;
/**
 * Request-side params for the list endpoint (snake_case API contract). All
 * fields are optional: `page`/`per_page` default server-side and the filters
 * are opt-in, so callers building query strings need not supply pagination.
 */
export type ListPolicyExecutionHistoryRequest = z.infer<typeof listPolicyExecutionHistoryRequestSchema>;
export declare const MAX_EMBEDDED_RULES_PER_ITEM = 20;
export declare const policyExecutionHistoryItemSchema: z.ZodObject<{
    dispatched_at: z.ZodString;
    policy: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    outcome: z.ZodEnum<{
        throttled: "throttled";
        dispatched: "dispatched";
    }>;
    episode_count: z.ZodNumber;
    action_group_count: z.ZodNumber;
    rules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    totalRuleCount: z.ZodNumber;
    workflows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;
export declare const searchMatchCountsSchema: z.ZodObject<{
    policies: z.ZodNumber;
    rules: z.ZodNumber;
    cap: z.ZodNumber;
}, z.core.$strip>;
export type SearchMatchCounts = z.infer<typeof searchMatchCountsSchema>;
export declare const listPolicyExecutionHistoryResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        dispatched_at: z.ZodString;
        policy: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        outcome: z.ZodEnum<{
            throttled: "throttled";
            dispatched: "dispatched";
        }>;
        episode_count: z.ZodNumber;
        action_group_count: z.ZodNumber;
        rules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        totalRuleCount: z.ZodNumber;
        workflows: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    totalEvents: z.ZodNumber;
    searchMatches: z.ZodNullable<z.ZodObject<{
        policies: z.ZodNumber;
        rules: z.ZodNumber;
        cap: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ListPolicyExecutionHistoryResponse = z.infer<typeof listPolicyExecutionHistoryResponseSchema>;
