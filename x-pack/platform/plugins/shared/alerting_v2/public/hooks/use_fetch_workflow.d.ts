import type { WorkflowDetailDto } from '@kbn/workflows';
export declare const useFetchWorkflow: (id: string | undefined, isEnabled?: boolean) => import("@tanstack/react-query").UseQueryResult<WorkflowDetailDto, Error>;
