import type { BeforeAgentHookContext, HookHandlerResult, HookLifecycle } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { InternalStartServices } from '../../services/types';
type WorkflowApi = WorkflowsServerPluginSetup['management'];
export interface RunBeforeAgentWorkflowsParams {
    context: BeforeAgentHookContext;
    workflowApi: WorkflowApi;
    getInternalServices: () => InternalStartServices;
    logger: Logger;
}
/**
 * Runs the agent's configured before-agent workflows in sequence, updating the
 * round input when a workflow returns `new_prompt`. Throws on workflow failure
 * or when a workflow aborts the agent.
 *
 * @returns Updated nextInput when any workflow returned `new_prompt`, otherwise undefined
 */
export declare function runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger, }: RunBeforeAgentWorkflowsParams): Promise<void | HookHandlerResult<HookLifecycle.beforeAgent>>;
export {};
