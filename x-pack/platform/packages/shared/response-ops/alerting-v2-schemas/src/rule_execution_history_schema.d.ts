import { z } from '@kbn/zod/v4';
/**
 * Coarse ECS-aligned outcome (`event.outcome`) for a single rule execution.
 *
 * Pinned to Task Manager's actual contract for `task-run` events: the
 * `EventLogOutcomes` enum in `task_manager/server/constants.ts` only
 * emits `success` and `failure`, and no other producer writes
 * `event.action: 'task-run'`.
 *
 * The fine-grained product taxonomy
 * (`success | warning | failed | timeout | skipped`) sourced from
 * `kibana.alerting_v2.rule_executor.execution.status` will land later
 * as a separate field so cross-platform ECS consumers stay unaffected.
 */
export declare const ruleExecutionOutcomeSchema: z.ZodEnum<{
    failure: "failure";
    success: "success";
}>;
export type RuleExecutionOutcome = z.infer<typeof ruleExecutionOutcomeSchema>;
export declare const listRuleExecutionsRequestSchema: z.ZodObject<{
    rule_ids: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    outcomes: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        failure: "failure";
        success: "success";
    }>, z.ZodArray<z.ZodEnum<{
        failure: "failure";
        success: "success";
    }>>]>, z.ZodTransform<("failure" | "success")[], "failure" | "success" | ("failure" | "success")[]>>>;
    from: z.ZodOptional<z.ZodISODateTime>;
    to: z.ZodOptional<z.ZodISODateTime>;
    sort_field: z.ZodDefault<z.ZodEnum<{
        duration_ms: "duration_ms";
        started_at: "started_at";
    }>>;
    sort_order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
}, z.core.$strict>;
export type ListRuleExecutionsRequest = z.infer<typeof listRuleExecutionsRequestSchema>;
export declare const ruleExecutionViewSchema: z.ZodObject<{
    id: z.ZodString;
    rule: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
    space_id: z.ZodString;
    started_at: z.ZodISODateTime;
    ended_at: z.ZodISODateTime;
    timings: z.ZodObject<{
        duration_ms: z.ZodNumber;
        scheduled_delay_ms: z.ZodNumber;
    }, z.core.$strip>;
    outcome: z.ZodEnum<{
        failure: "failure";
        success: "success";
    }>;
    reason: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodObject<{
        message: z.ZodString;
        stack_trace: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RuleExecutionView = z.infer<typeof ruleExecutionViewSchema>;
export declare const listRuleExecutionsResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        rule: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>;
        space_id: z.ZodString;
        started_at: z.ZodISODateTime;
        ended_at: z.ZodISODateTime;
        timings: z.ZodObject<{
            duration_ms: z.ZodNumber;
            scheduled_delay_ms: z.ZodNumber;
        }, z.core.$strip>;
        outcome: z.ZodEnum<{
            failure: "failure";
            success: "success";
        }>;
        reason: z.ZodNullable<z.ZodString>;
        error: z.ZodNullable<z.ZodObject<{
            message: z.ZodString;
            stack_trace: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    per_page: z.ZodNumber;
}, z.core.$strip>;
export type ListRuleExecutionsResponse = z.infer<typeof listRuleExecutionsResponseSchema>;
