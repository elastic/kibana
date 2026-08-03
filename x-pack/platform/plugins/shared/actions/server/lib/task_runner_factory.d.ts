import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { ActionExecutorContract } from './action_executor';
import type { ActionTypeRegistryContract, SpaceIdToNamespaceFunction } from '../types';
import type { InMemoryMetrics } from '../monitoring';
export interface TaskRunnerContext {
    logger: Logger;
    actionTypeRegistry: ActionTypeRegistryContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    spaceIdToNamespace: SpaceIdToNamespaceFunction;
    savedObjectsRepository: ISavedObjectsRepository;
}
export declare class TaskRunnerFactory {
    private isInitialized;
    private taskRunnerContext?;
    private readonly actionExecutor;
    private readonly inMemoryMetrics;
    constructor(actionExecutor: ActionExecutorContract, inMemoryMetrics: InMemoryMetrics);
    initialize(taskRunnerContext: TaskRunnerContext): void;
    create({ taskInstance, signal, executionUuid }: RunContext): {
        run(): Promise<void>;
        cancel: () => Promise<{
            state: {};
        }>;
        cleanup: () => Promise<void>;
    };
}
