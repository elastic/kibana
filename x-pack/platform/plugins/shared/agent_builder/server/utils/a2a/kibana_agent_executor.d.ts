import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import type { InternalStartServices } from '../../services';
/**
 * Agent executor that bridges A2A requests to Kibana's agentBuilder system
 */
export declare class KibanaAgentExecutor implements AgentExecutor {
    private logger;
    private getInternalServices;
    private kibanaRequest;
    private agentId;
    constructor(logger: Logger, getInternalServices: () => InternalStartServices, kibanaRequest: KibanaRequest, agentId: string);
    execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void>;
    cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void>;
    private sendErrorResponse;
}
