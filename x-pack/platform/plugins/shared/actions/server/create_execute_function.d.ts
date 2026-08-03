import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { TaskPriority, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { RawAction, ActionTypeRegistryContract, InMemoryConnector } from './types';
import type { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import type { ActionsConfigurationUtilities } from './actions_config';
interface CreateExecuteFunctionOptions {
    taskManager: TaskManagerStartContract;
    isESOCanEncrypt: boolean;
    actionTypeRegistry: ActionTypeRegistryContract;
    inMemoryConnectors: InMemoryConnector[];
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
}
export interface ExecuteOptions extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects' | 'consumer'> {
    id: string;
    uuid?: string;
    spaceId: string;
    apiKeyId?: string;
    apiKey: string | null;
    executionId: string;
    actionTypeId: string;
    priority?: TaskPriority;
}
export interface GetConnectorsResult {
    connector: InMemoryConnector | RawAction;
    isInMemory: boolean;
    id: string;
}
export type ExecutionEnqueuer<T> = (unsecuredSavedObjectsClient: SavedObjectsClientContract, options: ExecuteOptions) => Promise<T>;
export type BulkExecutionEnqueuer<T> = (unsecuredSavedObjectsClient: SavedObjectsClientContract, actionsToExectute: ExecuteOptions[]) => Promise<T>;
export declare enum ExecutionResponseType {
    SUCCESS = "success",
    QUEUED_ACTIONS_LIMIT_ERROR = "queuedActionsLimitError"
}
export interface ExecutionResponse {
    errors: boolean;
    items: ExecutionResponseItem[];
}
export interface ExecutionResponseItem {
    id: string;
    uuid?: string;
    actionTypeId: string;
    response: ExecutionResponseType;
}
export declare function createBulkExecutionEnqueuerFunction({ taskManager, actionTypeRegistry, isESOCanEncrypt, inMemoryConnectors, configurationUtilities, logger, }: CreateExecuteFunctionOptions): BulkExecutionEnqueuer<ExecutionResponse>;
export {};
