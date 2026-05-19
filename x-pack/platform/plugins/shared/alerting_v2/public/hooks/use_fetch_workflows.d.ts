import type { WorkflowListDto } from '@kbn/workflows';
interface UseFetchWorkflowsParams {
    query: string;
    isEnabled?: boolean;
}
export declare const useFetchWorkflows: ({ query, isEnabled }: UseFetchWorkflowsParams) => import("@kbn/react-query").UseQueryResult<WorkflowListDto, Error>;
export {};
