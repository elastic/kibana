import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { InternalSetupServices, InternalStartServices } from '../../services';
export interface RegisterBeforeAgentWorkflowsHookDeps {
    workflowsManagement?: WorkflowsServerPluginSetup;
    logger: Logger;
    getInternalServices: () => InternalStartServices;
}
/**
 * Registers the before-agent hook that runs the agent's configured workflows
 * in sequence before each conversation round. When workflows management is
 * not available, registration is skipped.
 */
export declare function registerBeforeAgentWorkflowsHook(serviceSetups: InternalSetupServices, deps: RegisterBeforeAgentWorkflowsHookDeps): void;
