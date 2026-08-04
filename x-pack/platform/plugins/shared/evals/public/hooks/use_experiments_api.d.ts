import type { RunExperimentResponse, SaveAsWorkflowResponse, PreviewExperimentResponse, GetExperimentTemplatesResponse, ExperimentExecutionStatus } from '../../common/experiments/run_experiment';
export interface ModelConnector {
    id: string;
    name: string;
    connectorTypeId: string;
    isDeprecated: boolean;
    isMissingSecrets: boolean;
}
export declare const MODEL_CONNECTOR_TYPE_IDS: readonly [".inference", ".gen-ai", ".bedrock", ".gemini"];
export declare const useExperimentTemplates: () => import("@tanstack/react-query").UseQueryResult<GetExperimentTemplatesResponse, unknown>;
export declare const useEvaluators: () => import("@tanstack/react-query").UseQueryResult<{
    evaluators: {
        name: string;
        version: string;
        kind: "code" | "llm";
        description: string;
        reference_data_schema?: {
            [x: string]: unknown;
        } | undefined;
        evidence_schema?: {
            [x: string]: unknown;
        } | undefined;
    }[];
}, unknown>;
export declare const useModelConnectors: () => import("@tanstack/react-query").UseQueryResult<ModelConnector[], unknown>;
/** A minimal view of an Agent Builder agent, used to populate the task-target picker. */
export interface AgentBuilderAgent {
    id: string;
    name?: string;
    description?: string;
}
/**
 * Lists Agent Builder agents (including built-in ones) so the experiment form can
 * suggest them.
 */
export declare const useAgentBuilderAgents: ({ enabled }?: {
    enabled?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<AgentBuilderAgent[], unknown>;
export declare const useRunExperiment: () => import("@tanstack/react-query").UseMutationResult<RunExperimentResponse, unknown, {
    connector_ids: string[];
    dataset_ids: string[];
    evaluators: {
        name: string;
        version?: string | undefined;
        connector_id?: string | undefined;
    }[];
    name?: string | undefined;
    agent_id?: string | undefined;
    task_ref?: string | undefined;
    params?: Record<string, unknown> | undefined;
    repetitions?: number | undefined;
    concurrency?: number | undefined;
    compare?: boolean | undefined;
    workflow_id?: string | undefined;
    space_ids?: string[] | undefined;
}, unknown>;
export declare const useSaveExperimentWorkflow: () => import("@tanstack/react-query").UseMutationResult<SaveAsWorkflowResponse, unknown, {
    connector_ids: string[];
    dataset_ids: string[];
    evaluators: {
        name: string;
        version?: string | undefined;
        connector_id?: string | undefined;
    }[];
    name?: string | undefined;
    agent_id?: string | undefined;
    task_ref?: string | undefined;
    params?: Record<string, unknown> | undefined;
    repetitions?: number | undefined;
    concurrency?: number | undefined;
    compare?: boolean | undefined;
    workflow_id?: string | undefined;
    space_ids?: string[] | undefined;
}, unknown>;
export declare const usePreviewExperiment: () => import("@tanstack/react-query").UseMutationResult<PreviewExperimentResponse, unknown, {
    connector_ids: string[];
    dataset_ids: string[];
    evaluators: {
        name: string;
        version?: string | undefined;
        connector_id?: string | undefined;
    }[];
    name?: string | undefined;
    agent_id?: string | undefined;
    task_ref?: string | undefined;
    params?: Record<string, unknown> | undefined;
    repetitions?: number | undefined;
    concurrency?: number | undefined;
    compare?: boolean | undefined;
    workflow_id?: string | undefined;
    space_ids?: string[] | undefined;
}, unknown>;
export declare const useCancelWorkflowExecution: () => import("@tanstack/react-query").UseMutationResult<{
    cancelled: boolean;
}, unknown, string, unknown>;
export declare const isTerminalExecutionStatus: (status: string) => boolean;
export interface WorkflowExecutionView {
    id: string;
    data?: ExperimentExecutionStatus;
    isError: boolean;
}
export interface WorkflowExecutionsState {
    executions: WorkflowExecutionView[];
    allSettled: boolean;
    isLoading: boolean;
    scoresIngested: number;
}
export declare const sumScoresIngested: (execution?: ExperimentExecutionStatus) => number;
/**
 * Reports `scoresIngested` so the detail page can defer its experiment-document query: the
 * experiment doc only exists once scores are ingested, so querying earlier 404s.
 */
export declare const useWorkflowExecutions: (workflowExecutionIds: string[]) => WorkflowExecutionsState;
