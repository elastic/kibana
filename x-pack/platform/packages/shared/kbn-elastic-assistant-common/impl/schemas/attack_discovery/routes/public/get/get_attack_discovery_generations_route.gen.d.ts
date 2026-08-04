import { z } from '@kbn/zod/v4';
export declare const GetAttackDiscoveryGenerationsRequestQuery: z.ZodObject<{
    end: z.ZodOptional<z.ZodString>;
    size: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    scheduled: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
    start: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetAttackDiscoveryGenerationsRequestQuery = z.infer<typeof GetAttackDiscoveryGenerationsRequestQuery>;
export type GetAttackDiscoveryGenerationsRequestQueryInput = z.input<typeof GetAttackDiscoveryGenerationsRequestQuery>;
export declare const GetAttackDiscoveryGenerationsResponse: z.ZodObject<{
    generations: z.ZodArray<z.ZodObject<{
        alerts_context_count: z.ZodOptional<z.ZodNumber>;
        connector_id: z.ZodString;
        connector_stats: z.ZodOptional<z.ZodObject<{
            average_successful_duration_nanoseconds: z.ZodOptional<z.ZodNumber>;
            successful_generations: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        conversation_id: z.ZodOptional<z.ZodString>;
        discoveries: z.ZodNumber;
        duplicates_dropped_count: z.ZodOptional<z.ZodNumber>;
        generated_count: z.ZodOptional<z.ZodNumber>;
        hallucinations_filtered_count: z.ZodOptional<z.ZodNumber>;
        persisted_count: z.ZodOptional<z.ZodNumber>;
        end: z.ZodOptional<z.ZodString>;
        execution_uuid: z.ZodString;
        loading_message: z.ZodOptional<z.ZodString>;
        error_category: z.ZodOptional<z.ZodString>;
        failed_workflow_id: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        start: z.ZodString;
        status: z.ZodEnum<{
            failed: "failed";
            canceled: "canceled";
            dismissed: "dismissed";
            started: "started";
            succeeded: "succeeded";
        }>;
        step_event_actions: z.ZodOptional<z.ZodArray<z.ZodString>>;
        workflow_executions: z.ZodOptional<z.ZodObject<{
            alertRetrieval: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                workflowId: z.ZodString;
                workflowName: z.ZodOptional<z.ZodString>;
                workflowRunId: z.ZodString;
            }, z.core.$strip>>>>;
            gate: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                workflowId: z.ZodString;
                workflowName: z.ZodOptional<z.ZodString>;
                workflowRunId: z.ZodString;
            }, z.core.$strip>>>>;
            generation: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                workflowId: z.ZodString;
                workflowName: z.ZodOptional<z.ZodString>;
                workflowRunId: z.ZodString;
            }, z.core.$strip>>>;
            validation: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                workflowId: z.ZodString;
                workflowName: z.ZodOptional<z.ZodString>;
                workflowRunId: z.ZodString;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
        workflow_id: z.ZodOptional<z.ZodString>;
        source_metadata: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            action_execution_uuid: z.ZodOptional<z.ZodString>;
            rule_id: z.ZodOptional<z.ZodString>;
            rule_name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        workflow_run_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetAttackDiscoveryGenerationsResponse = z.infer<typeof GetAttackDiscoveryGenerationsResponse>;
