import { z } from '@kbn/zod/v4';
export declare const WorkflowExecutionReference: z.ZodObject<{
    workflowId: z.ZodString;
    workflowName: z.ZodOptional<z.ZodString>;
    workflowRunId: z.ZodString;
}, z.core.$strip>;
export type WorkflowExecutionReference = z.infer<typeof WorkflowExecutionReference>;
/**
 * Workflow execution tracking for manual orchestration
 */
export declare const WorkflowExecutionsTracking: z.ZodObject<{
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
}, z.core.$strip>;
export type WorkflowExecutionsTracking = z.infer<typeof WorkflowExecutionsTracking>;
export declare const AttackDiscoveryGeneration: z.ZodObject<{
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
}, z.core.$strip>;
export type AttackDiscoveryGeneration = z.infer<typeof AttackDiscoveryGeneration>;
