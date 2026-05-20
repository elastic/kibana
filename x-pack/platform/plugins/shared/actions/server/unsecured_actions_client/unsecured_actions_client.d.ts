import type { IClusterClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { BulkUnsecuredExecutionEnqueuer, ExecuteOptions, ExecutionResponse } from '../create_unsecured_execute_function';
import type { ActionExecutorContract } from '../lib';
import type { ActionTypeExecutorResult, InMemoryConnector } from '../types';
import type { ConnectorWithExtraFindData } from '../application/connector/types';
import type { ActionTypeRegistry } from '../action_type_registry';
export interface UnsecuredActionsClientOpts {
    actionExecutor: ActionExecutorContract;
    clusterClient: IClusterClient;
    executionEnqueuer: BulkUnsecuredExecutionEnqueuer<ExecutionResponse>;
    inMemoryConnectors: InMemoryConnector[];
    internalSavedObjectsRepository: ISavedObjectsRepository;
    kibanaIndices: string[];
    logger: Logger;
    connectorTypeRegistry: ActionTypeRegistry;
}
type UnsecuredExecuteOptions = Omit<ExecuteOptions, 'source'> & {
    spaceId: string;
    requesterId: string;
};
export interface IUnsecuredActionsClient {
    getAll: (spaceId: string) => Promise<ConnectorWithExtraFindData[]>;
    execute: (opts: UnsecuredExecuteOptions) => Promise<ActionTypeExecutorResult<unknown>>;
    bulkEnqueueExecution: (requesterId: string, actionsToExecute: ExecuteOptions[]) => Promise<ExecutionResponse>;
}
export declare class UnsecuredActionsClient {
    private readonly opts;
    constructor(opts: UnsecuredActionsClientOpts);
    execute({ requesterId, id, params, relatedSavedObjects, spaceId, }: UnsecuredExecuteOptions): Promise<ActionTypeExecutorResult<unknown>>;
    bulkEnqueueExecution(requesterId: string, actionsToExecute: ExecuteOptions[]): Promise<ExecutionResponse>;
    getAll(spaceId: string): Promise<ConnectorWithExtraFindData[]>;
    private getSourceFromRequester;
}
export {};
