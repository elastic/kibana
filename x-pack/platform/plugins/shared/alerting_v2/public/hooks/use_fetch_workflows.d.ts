import type { WorkflowListDto } from '@kbn/workflows';
interface UseFetchWorkflowsParams {
    query: string;
    tags?: string[];
    isEnabled?: boolean;
}
export declare const useFetchWorkflows: ({ query, tags, isEnabled }: UseFetchWorkflowsParams) => import("@tanstack/react-query").UseQueryResult<WorkflowListDto, Error>;
export {};
