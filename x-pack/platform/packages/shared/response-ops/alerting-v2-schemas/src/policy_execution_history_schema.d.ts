import { z } from '@kbn/zod/v4';
export declare const policyExecutionOutcomeSchema: z.ZodEnum<{
    failure: "failure";
    success: "success";
    throttled: "throttled";
}>;
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;
export declare const dispatchFailureReasonSchema: z.ZodEnum<{
    license_not_supported: "license_not_supported";
    missing_api_key: "missing_api_key";
    schedule_error: "schedule_error";
    workflow_disabled: "workflow_disabled";
    workflow_not_found: "workflow_not_found";
}>;
export type DispatchFailureReason = z.infer<typeof dispatchFailureReasonSchema>;
export declare const policyExecutionOutcomeFilterSchema: z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
    failure: "failure";
    success: "success";
    throttled: "throttled";
}>, z.ZodArray<z.ZodEnum<{
    failure: "failure";
    success: "success";
    throttled: "throttled";
}>>]>, z.ZodTransform<("failure" | "success" | "throttled")[], "failure" | "success" | "throttled" | ("failure" | "success" | "throttled")[]>>;
export type PolicyExecutionOutcomeFilter = z.infer<typeof policyExecutionOutcomeFilterSchema>;
export declare const listPolicyExecutionHistoryRequestSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    rule_ids: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    outcomes: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        failure: "failure";
        success: "success";
        throttled: "throttled";
    }>, z.ZodArray<z.ZodEnum<{
        failure: "failure";
        success: "success";
        throttled: "throttled";
    }>>]>, z.ZodTransform<("failure" | "success" | "throttled")[], "failure" | "success" | "throttled" | ("failure" | "success" | "throttled")[]>>>;
    page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
    from: z.ZodOptional<z.ZodISODateTime>;
    to: z.ZodOptional<z.ZodISODateTime>;
    alert_ids: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    sort_field: z.ZodDefault<z.ZodEnum<{
        dispatched_at: "dispatched_at";
    }>>;
    sort_order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strict>;
/**
 * Request-side params for the list endpoint (snake_case API contract). All
 * fields are optional: `page`/`per_page` default server-side and the filters
 * are opt-in, so callers building query strings need not supply pagination.
 */
export type ListPolicyExecutionHistoryRequest = z.infer<typeof listPolicyExecutionHistoryRequestSchema>;
export declare const namedRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const MAX_EMBEDDED_RULES_PER_ITEM = 20;
export declare const MAX_EMBEDDED_ALERTS_PER_ITEM = 50;
export declare const policyExecutionHistoryItemSchema: z.ZodObject<{
    dispatched_at: z.ZodISODateTime;
    policy: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    outcome: z.ZodEnum<{
        failure: "failure";
        success: "success";
        throttled: "throttled";
    }>;
    alert_count: z.ZodNumber;
    alerts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>>;
    action_group_count: z.ZodNumber;
    rules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    rule_count: z.ZodNumber;
    workflows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    failure_reason: z.ZodOptional<z.ZodEnum<{
        license_not_supported: "license_not_supported";
        missing_api_key: "missing_api_key";
        schedule_error: "schedule_error";
        workflow_disabled: "workflow_disabled";
        workflow_not_found: "workflow_not_found";
    }>>;
    error: z.ZodNullable<z.ZodObject<{
        message: z.ZodString;
        stack_trace: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;
export declare const searchMatchCountsSchema: z.ZodObject<{
    policies: z.ZodNumber;
    rules: z.ZodNumber;
    is_truncated: z.ZodBoolean;
}, z.core.$strip>;
export type SearchMatchCounts = z.infer<typeof searchMatchCountsSchema>;
export declare const listPolicyExecutionHistoryResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        dispatched_at: z.ZodISODateTime;
        policy: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        outcome: z.ZodEnum<{
            failure: "failure";
            success: "success";
            throttled: "throttled";
        }>;
        alert_count: z.ZodNumber;
        alerts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>>;
        action_group_count: z.ZodNumber;
        rules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        rule_count: z.ZodNumber;
        workflows: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        failure_reason: z.ZodOptional<z.ZodEnum<{
            license_not_supported: "license_not_supported";
            missing_api_key: "missing_api_key";
            schedule_error: "schedule_error";
            workflow_disabled: "workflow_disabled";
            workflow_not_found: "workflow_not_found";
        }>>;
        error: z.ZodNullable<z.ZodObject<{
            message: z.ZodString;
            stack_trace: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    per_page: z.ZodNumber;
    total: z.ZodNumber;
    search_matches: z.ZodNullable<z.ZodObject<{
        policies: z.ZodNumber;
        rules: z.ZodNumber;
        is_truncated: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ListPolicyExecutionHistoryResponse = z.infer<typeof listPolicyExecutionHistoryResponseSchema>;
