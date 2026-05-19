import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AnalyticsServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import { type SecurityServiceStart } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { ActionTypeConfig, ActionTypeExecutorResult, ActionTypeRegistryContract, ActionTypeSecrets, ConnectorTokenClientContract, GetServicesFunction, GetUnsecuredServicesFunction, InMemoryConnector, RawAction } from '../types';
import type { ActionExecutionSource } from './action_execution_source';
import type { RelatedSavedObjects } from './related_saved_objects';
import type { ActionsAuthorization } from '../authorization/actions_authorization';
import type { ConnectorRateLimiter } from './connector_rate_limiter';
export interface ActionExecutorContext {
    logger: Logger;
    spaces?: SpacesServiceStart;
    security: SecurityServiceStart;
    getServices: GetServicesFunction;
    getUnsecuredServices: GetUnsecuredServicesFunction;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    actionTypeRegistry: ActionTypeRegistryContract;
    analyticsService: AnalyticsServiceStart;
    eventLogger: IEventLogger;
    inMemoryConnectors: InMemoryConnector[];
    getActionsAuthorizationWithRequest: (request: KibanaRequest) => ActionsAuthorization;
    getCurrentUserProfileIdFromAPIKey: (request: KibanaRequest) => Promise<string | undefined>;
}
export interface TaskInfo {
    scheduled: Date;
    attempts: number;
}
export interface ExecuteOptions<Source = unknown> {
    actionExecutionId: string;
    actionId: string;
    consumer?: string;
    executionId?: string;
    params: Record<string, unknown>;
    relatedSavedObjects?: RelatedSavedObjects;
    request: KibanaRequest;
    /**
     * Optional space override. When provided, Action execution will be scoped to this spaceId.
     */
    spaceId?: string;
    source?: ActionExecutionSource<Source>;
    taskInfo?: TaskInfo;
    connectorTokenClient?: ConnectorTokenClientContract;
    signal?: AbortSignal;
}
type UnsecuredExecuteOptions<Source = unknown> = Pick<ExecuteOptions<Source>, 'actionExecutionId' | 'actionId' | 'params' | 'relatedSavedObjects' | 'source'> & {
    spaceId: string;
};
export type ActionExecutorContract = PublicMethodsOf<ActionExecutor>;
export declare class ActionExecutor {
    private isInitialized;
    private actionExecutorContext?;
    private readonly isESOCanEncrypt;
    private connectorRateLimiter;
    private actionInfo;
    constructor({ isESOCanEncrypt, connectorRateLimiter, }: {
        isESOCanEncrypt: boolean;
        connectorRateLimiter: ConnectorRateLimiter;
    });
    initialize(actionExecutorContext: ActionExecutorContext): void;
    execute({ actionExecutionId, actionId, connectorTokenClient, consumer, executionId, request, params, relatedSavedObjects, spaceId: spaceIdOverride, source, taskInfo, signal, }: ExecuteOptions): Promise<ActionTypeExecutorResult<unknown>>;
    executeUnsecured({ actionExecutionId, actionId, params, relatedSavedObjects, spaceId, source, }: UnsecuredExecuteOptions): Promise<ActionTypeExecutorResult<unknown>>;
    logCancellation<Source = unknown>({ actionId, request, relatedSavedObjects, source, executionId, taskInfo, consumer, actionExecutionId, spaceId: spaceIdOverride, }: {
        actionId: string;
        actionExecutionId: string;
        request: KibanaRequest;
        taskInfo?: TaskInfo;
        executionId?: string;
        relatedSavedObjects: RelatedSavedObjects;
        source?: ActionExecutionSource<Source>;
        consumer?: string;
        spaceId?: string;
    }): Promise<void>;
    private getActionInfoInternal;
    private executeHelper;
}
export interface ActionInfo {
    actionTypeId: string;
    name: string;
    config: ActionTypeConfig;
    secrets: ActionTypeSecrets;
    actionId: string;
    isInMemory?: boolean;
    rawAction: RawAction;
}
export {};
