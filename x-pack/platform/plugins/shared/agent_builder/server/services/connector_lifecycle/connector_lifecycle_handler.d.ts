import type { Logger } from '@kbn/logging';
import type { ConnectorLifecyclePostCreateParams, ConnectorLifecyclePostDeleteParams } from '@kbn/actions-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ServiceManager } from '..';
interface ConnectorLifecycleHandlerDeps {
    serviceManager: ServiceManager;
    workflowsManagement?: WorkflowsServerPluginSetup;
    logger: Logger;
}
export declare function createConnectorLifecycleHandler(deps: ConnectorLifecycleHandlerDeps): {
    onPostCreate(params: ConnectorLifecyclePostCreateParams): Promise<void>;
    onPostDelete(params: ConnectorLifecyclePostDeleteParams): Promise<void>;
};
export {};
