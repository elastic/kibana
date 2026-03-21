import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowExecutionResult } from './types';
type WorkflowApi = WorkflowsServerPluginSetup['management'];
export interface ExecuteWorkflowParams {
    workflowId: string;
    workflowParams: Record<string, unknown>;
    request: KibanaRequest;
    spaceId: string;
    workflowApi: WorkflowApi;
    waitForCompletion?: boolean;
    completionTimeoutSec?: number;
    metadata?: Record<string, unknown>;
}
export declare const executeWorkflow: ({ workflowId, workflowParams, request, spaceId, workflowApi, waitForCompletion, completionTimeoutSec, metadata, }: ExecuteWorkflowParams) => Promise<WorkflowExecutionResult>;
export {};
