import { z } from '@kbn/zod/v4';
import type { WorkflowDetailDto } from '@kbn/workflows';
export declare const MAX_ID_LENGTH = 1024;
export declare const MAX_NAME_LENGTH = 256;
export declare const EVALS_EXPERIMENT_WORKFLOW_TAG = "evals-experiment";
export declare const EVALS_WORKFLOW_TAGS: readonly ["evals", "evals-experiment"];
export declare const isEvalsOwnedWorkflow: (workflow: Pick<WorkflowDetailDto, "definition"> | null | undefined) => boolean;
export declare const experimentEvaluatorSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    connector_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ExperimentEvaluator = z.infer<typeof experimentEvaluatorSchema>;
export declare const EXPERIMENT_LIMITS: {
    readonly maxConnectorIds: 50;
    readonly maxDatasetIds: 50;
    readonly maxEvaluators: 50;
    readonly maxRepetitions: 100;
    readonly maxConcurrency: 50;
    readonly maxSpaceIds: 100;
};
export declare const runExperimentRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    connector_ids: z.ZodArray<z.ZodString>;
    agent_id: z.ZodOptional<z.ZodString>;
    task_ref: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dataset_ids: z.ZodArray<z.ZodString>;
    evaluators: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connector_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    repetitions: z.ZodOptional<z.ZodNumber>;
    concurrency: z.ZodOptional<z.ZodNumber>;
    compare: z.ZodOptional<z.ZodBoolean>;
    workflow_id: z.ZodOptional<z.ZodString>;
    space_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type RunExperimentRequest = z.infer<typeof runExperimentRequestSchema>;
export declare const EXPERIMENT_RUN_MODES: readonly ["single", "dataset-fanout", "cross-model"];
export type ExperimentRunMode = (typeof EXPERIMENT_RUN_MODES)[number];
/** One launched execution: its model connector, score-grouping id, and workflow run id. */
export interface LaunchedExecution {
    execution_id: string;
    connector_id: string;
    workflow_execution_id: string;
}
export interface RunExperimentResponse {
    execution_id: string;
    mode: ExperimentRunMode;
    compare_by: 'execution' | 'experiment';
    experiment_ids: string[];
    workflow_execution_ids: string[];
    executions: LaunchedExecution[];
}
export interface SaveAsWorkflowResponse {
    workflow_id: string;
    name: string;
}
export interface LaunchedExperimentConfig {
    name?: string;
    /** Display label of the chosen task target (e.g. "Agent Builder agent (converse)"). */
    target_label: string;
    agent_id?: string;
    connector_names: string[];
    dataset_names: string[];
    evaluator_names: string[];
    repetitions?: number;
    concurrency?: number;
}
export interface ExperimentTemplate {
    /** Stable id - a task provider name for `task_provider` templates. */
    id: string;
    name: string;
    description?: string;
    kind: 'starter' | 'task_provider';
    /** Hints for pre-filling the new-experiment form when the template is chosen. */
    prefill?: {
        task_ref?: string;
        agent_id?: string;
    };
}
export interface GetExperimentTemplatesResponse {
    templates: ExperimentTemplate[];
}
export interface PreviewExperimentResponse {
    yaml: string;
}
/** Compact progress counters extracted from the `ai.evals.evaluateDataset` step state. */
export interface ExperimentStepProgress {
    total?: number;
    completed?: number;
    failed?: number;
    scores_ingested?: number;
    errors?: string[];
}
export interface ExperimentExecutionStepStatus {
    step_id: string;
    step_type?: string;
    /** Mirrors the Workflows engine `ExecutionStatus` (e.g. `running`, `completed`, `failed`). */
    status: string;
    progress?: ExperimentStepProgress;
    error?: string;
}
export interface ExperimentExecutionStatus {
    id: string;
    /** Mirrors the Workflows engine `ExecutionStatus`. */
    status: string;
    error?: string;
    started_at?: string;
    finished_at?: string;
    steps: ExperimentExecutionStepStatus[];
}
