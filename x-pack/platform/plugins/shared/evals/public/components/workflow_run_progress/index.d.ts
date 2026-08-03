import React from 'react';
import type { WorkflowExecutionView } from '../../hooks/use_experiments_api';
/** ES-derived live counts used to floor a running step's own (batched) counters. */
interface DatasetProgressFloor {
    scoresIngested: number;
    examplesDone: number;
}
export interface WorkflowRunProgressProps {
    /** Per-execution status views, polled centrally by the page. */
    executions: WorkflowExecutionView[];
    /** Optional human label (e.g. model name) rendered on each card, by execution id. */
    getLabel?: (workflowExecutionId: string) => string | undefined;
    /**
     * ES-derived live counts used to floor the step's own counters, which read 0
     * during an in-flight batch. Applied only to single-dataset-step runs.
     */
    progressFloor?: DatasetProgressFloor;
}
/**
 * Renders the live progress (per-dataset counters, captured failures, and a
 * cancel action while running) for one or more launched workflow executions. The
 * execution statuses are polled by the parent (see `useWorkflowExecutions`) and
 * passed in, so this component performs no fetching of its own.
 */
export declare const WorkflowRunProgress: React.FC<WorkflowRunProgressProps>;
export {};
