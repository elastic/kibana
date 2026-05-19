import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IScopedClusterClient, SavedObjectsClientContract, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { AxiosInstance } from 'axios';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { Connector, ConnectorWithExtraFindData } from '../application/connector/types';
import type { ConnectorType } from '../application/connector/types';
import type { GetAuthStatusResult } from '../application/connector/methods/get_auth_status/types';
import type { GetGlobalExecutionKPIParams, GetGlobalExecutionLogParams, IExecutionLogResult } from '../../common';
import type { ActionTypeRegistry } from '../action_type_registry';
import type { AuthTypeRegistry } from '../auth_types/auth_type_registry';
import type { ActionExecutorContract } from '../lib';
import type { ActionResult, InMemoryConnector, ActionTypeExecutorResult, ConnectorTokenClientContract, ConnectorLifecycleListener } from '../types';
import type { ExecuteOptions as EnqueueExecutionOptions, BulkExecutionEnqueuer, ExecutionResponse } from '../create_execute_function';
import type { ActionsAuthorization } from '../authorization/actions_authorization';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthParams } from '../routes/get_oauth_access_token';
import type { ListTypesParams } from '../application/connector/methods/list_types/types';
import type { ConnectorUpdateParams } from '../application/connector/methods/update/types';
import type { ConnectorCreateParams } from '../application/connector/methods/create/types';
import type { ConnectorExecuteParams } from '../application/connector/methods/execute/types';
import type { GetAxiosInstanceWithAuthFnOpts } from '../lib/get_axios_instance';
export interface ConstructorOptions {
    logger: Logger;
    kibanaIndices: string[];
    scopedClusterClient: IScopedClusterClient;
    actionTypeRegistry: ActionTypeRegistry;
    authTypeRegistry: AuthTypeRegistry;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    inMemoryConnectors: InMemoryConnector[];
    actionExecutor: ActionExecutorContract;
    bulkExecutionEnqueuer: BulkExecutionEnqueuer<ExecutionResponse>;
    request: KibanaRequest;
    /**
     * Optional space override. When set, connector operations and executions will be scoped to this spaceId
     */
    spaceId?: string;
    authorization: ActionsAuthorization;
    auditLogger?: AuditLogger;
    usageCounter?: UsageCounter;
    connectorTokenClient: ConnectorTokenClientContract;
    getEventLogClient: () => Promise<IEventLogClient>;
    getAxiosInstanceWithAuth: (getAxiosParams: GetAxiosInstanceWithAuthFnOpts) => Promise<AxiosInstance>;
    spaces?: SpacesServiceSetup;
    isESOCanEncrypt: boolean;
    connectorLifecycleListeners?: ConnectorLifecycleListener[];
    getCurrentUserProfileId?: (request: KibanaRequest) => Promise<string | undefined>;
}
export interface ActionsClientContext {
    logger: Logger;
    kibanaIndices: string[];
    scopedClusterClient: IScopedClusterClient;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    actionTypeRegistry: ActionTypeRegistry;
    authTypeRegistry: AuthTypeRegistry;
    inMemoryConnectors: InMemoryConnector[];
    actionExecutor: ActionExecutorContract;
    request: KibanaRequest;
    spaceId?: string;
    authorization: ActionsAuthorization;
    bulkExecutionEnqueuer: BulkExecutionEnqueuer<ExecutionResponse>;
    auditLogger?: AuditLogger;
    usageCounter?: UsageCounter;
    connectorTokenClient: ConnectorTokenClientContract;
    getEventLogClient: () => Promise<IEventLogClient>;
    getAxiosInstanceWithAuth: (getAxiosParams: GetAxiosInstanceWithAuthFnOpts) => Promise<AxiosInstance>;
    spaces?: SpacesServiceSetup;
    isESOCanEncrypt: boolean;
    connectorLifecycleListeners?: ConnectorLifecycleListener[];
    getCurrentUserProfileId?: (request: KibanaRequest) => Promise<string | undefined>;
}
export declare class ActionsClient {
    private readonly context;
    constructor({ logger, actionTypeRegistry, authTypeRegistry, kibanaIndices, scopedClusterClient, encryptedSavedObjectsClient, unsecuredSavedObjectsClient, inMemoryConnectors, actionExecutor, bulkExecutionEnqueuer, request, spaceId, authorization, auditLogger, usageCounter, connectorTokenClient, getEventLogClient, getAxiosInstanceWithAuth, spaces, isESOCanEncrypt, connectorLifecycleListeners, getCurrentUserProfileId, }: ConstructorOptions);
    /**
     * Create an action
     */
    create({ action, options, }: Omit<ConnectorCreateParams, 'context'>): Promise<ActionResult>;
    /**
     * Update connector
     */
    update({ id, action, }: Pick<ConnectorUpdateParams, 'id' | 'action'>): Promise<Connector>;
    /**
     * Get a connector
     */
    get({ id, throwIfSystemAction, }: {
        id: string;
        throwIfSystemAction?: boolean;
    }): Promise<ActionResult>;
    /**
     * Get all connectors with in-memory connectors
     */
    getAll({ includeSystemActions }?: {
        includeSystemActions?: boolean | undefined;
    }): Promise<ConnectorWithExtraFindData[]>;
    /**
     * Get all system connectors
     */
    getAllSystemConnectors(): Promise<ConnectorWithExtraFindData[]>;
    /**
     * Auth status for all connectors visible in the current space (persisted + in-memory).
     */
    getAuthStatus(): Promise<GetAuthStatusResult>;
    getConnectorSpec({ id, configurationUtilities, }: {
        id: string;
        configurationUtilities: ActionsConfigurationUtilities;
    }): Promise<{
        metadata: import("@kbn/connector-specs").ConnectorMetadata;
        schema: Record<string, unknown>;
    }>;
    /**
     * Get bulk actions with in-memory list
     */
    getBulk({ ids, throwIfSystemAction, }: {
        ids: string[];
        throwIfSystemAction?: boolean;
    }): Promise<(ActionResult | InMemoryConnector)[]>;
    getOAuthAccessToken({ type, options }: OAuthParams, configurationUtilities: ActionsConfigurationUtilities): Promise<{
        accessToken: string | null;
    }>;
    /**
     * Delete action
     */
    delete({ id }: {
        id: string;
    }): Promise<{}>;
    execute(connectorExecuteParams: ConnectorExecuteParams): Promise<ActionTypeExecutorResult<unknown>>;
    getAxiosInstance(actionId: string): Promise<AxiosInstance>;
    bulkEnqueueExecution(options: EnqueueExecutionOptions[]): Promise<ExecutionResponse>;
    listTypes({ featureId, includeSystemActionTypes, }?: ListTypesParams): Promise<ConnectorType[]>;
    isActionTypeEnabled(actionTypeId: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    isPreconfigured(connectorId: string): boolean;
    isSystemAction(connectorId: string): boolean;
    getGlobalExecutionLogWithAuth({ dateStart, dateEnd, filter, page, perPage, sort, namespaces, }: GetGlobalExecutionLogParams): Promise<IExecutionLogResult>;
    getGlobalExecutionKpiWithAuth({ dateStart, dateEnd, filter, namespaces, }: GetGlobalExecutionKPIParams): Promise<{
        success: number;
        unknown: number;
        failure: number;
        warning: number;
    }>;
}
