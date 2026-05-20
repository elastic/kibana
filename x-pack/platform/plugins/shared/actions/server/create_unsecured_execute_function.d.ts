import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ActionTypeRegistryContract as ConnectorTypeRegistryContract, InMemoryConnector } from './types';
import type { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import type { ExecutionResponseItem } from './create_execute_function';
import type { ActionsConfigurationUtilities } from './actions_config';
interface CreateBulkUnsecuredExecuteFunctionOptions {
    taskManager: TaskManagerStartContract;
    connectorTypeRegistry: ConnectorTypeRegistryContract;
    inMemoryConnectors: InMemoryConnector[];
    configurationUtilities: ActionsConfigurationUtilities;
}
export interface ExecuteOptions extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects'> {
    id: string;
}
export interface ExecutionResponse {
    errors: boolean;
    items: ExecutionResponseItem[];
}
export type BulkUnsecuredExecutionEnqueuer<T> = (internalSavedObjectsRepository: ISavedObjectsRepository, actionsToExectute: ExecuteOptions[]) => Promise<T>;
export declare function createBulkUnsecuredExecutionEnqueuerFunction({ taskManager, connectorTypeRegistry, inMemoryConnectors, configurationUtilities, }: CreateBulkUnsecuredExecuteFunctionOptions): BulkUnsecuredExecutionEnqueuer<ExecutionResponse>;
export {};
