import type { HttpStart } from '@kbn/core/public';
import type { WorkflowDetailDto, WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
export declare class WorkflowsApi {
    private readonly http;
    constructor(http: HttpStart);
    getWorkflow(id: string): Promise<WorkflowDetailDto>;
    searchWorkflows(params: WorkflowsSearchParams): Promise<WorkflowListDto>;
}
