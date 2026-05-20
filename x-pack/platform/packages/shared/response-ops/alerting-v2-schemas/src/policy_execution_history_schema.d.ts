import { z } from '@kbn/zod/v4';
export declare const POLICY_EXECUTION_HISTORY_MAX_PER_PAGE = 100;
export declare const policyExecutionOutcomeSchema: z.ZodEnum<{
    throttled: "throttled";
    dispatched: "dispatched";
}>;
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;
export declare const listPolicyExecutionHistoryQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type ListPolicyExecutionHistoryParams = z.infer<typeof listPolicyExecutionHistoryQuerySchema>;
export declare const countPolicyExecutionEventsQuerySchema: z.ZodObject<{
    since: z.ZodString;
}, z.core.$strip>;
export type CountPolicyExecutionEventsParams = z.infer<typeof countPolicyExecutionEventsQuerySchema>;
export declare const policyExecutionHistoryItemSchema: z.ZodObject<{
    '@timestamp': z.ZodString;
    policy: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    rule: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    outcome: z.ZodEnum<{
        throttled: "throttled";
        dispatched: "dispatched";
    }>;
    episode_count: z.ZodNumber;
    action_group_count: z.ZodNumber;
    workflows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;
export declare const listPolicyExecutionHistoryResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        '@timestamp': z.ZodString;
        policy: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        rule: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        outcome: z.ZodEnum<{
            throttled: "throttled";
            dispatched: "dispatched";
        }>;
        episode_count: z.ZodNumber;
        action_group_count: z.ZodNumber;
        workflows: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    totalEvents: z.ZodNumber;
}, z.core.$strip>;
export type ListPolicyExecutionHistoryResponse = z.infer<typeof listPolicyExecutionHistoryResponseSchema>;
export declare const countPolicyExecutionEventsResponseSchema: z.ZodObject<{
    count: z.ZodNumber;
}, z.core.$strip>;
export type CountPolicyExecutionEventsResponse = z.infer<typeof countPolicyExecutionEventsResponseSchema>;
