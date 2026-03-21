import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
type WorkflowApi = WorkflowsServerPluginSetup['management'];
export interface WorkflowExecutionState {
    execution_id: string;
    status: ExecutionStatus;
    workflow_id: string;
    started_at: string;
    finished_at?: string;
    output?: JsonValue;
    workflow_name?: string;
    /** Present when status is FAILED; contains the workflow error message. */
    error_message?: string;
}
/**
 * Returns the state of a workflow execution.
 */
export declare const getExecutionState: ({ executionId, spaceId, workflowApi, }: {
    executionId: string;
    spaceId: string;
    workflowApi: WorkflowApi;
}) => Promise<WorkflowExecutionState | null>;
export {};
