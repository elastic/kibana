import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { TaskClient } from '../tasks/task_client';
export interface ContinuousKiExtractionWorkflowService {
    ensureWorkflow(params: {
        enabled: boolean;
        request: KibanaRequest;
        taskClient: TaskClient<string>;
    }): Promise<void>;
}
export declare const createContinuousKiExtractionWorkflowService: (logger: Logger, managementApi: WorkflowsServerPluginSetup["management"]) => ContinuousKiExtractionWorkflowService;
