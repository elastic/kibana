import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import type { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { AxiosInstance } from 'axios';
import type { UsageApiSetup } from '@kbn/usage-api-plugin/server';
import { type EnabledConnectorTypes } from './config';
import { ActionsClient } from './actions_client/actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import type { ActionType, InMemoryConnector, ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, ConnectorLifecycleListener } from './types';
import type { ActionsConfigurationUtilities } from './actions_config';
import { ActionsAuthorization } from './authorization/actions_authorization';
import type { ICaseServiceAbstract, IServiceAbstract, SubActionConnectorType } from './sub_action_framework/types';
import type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
import type { GetAxiosInstanceWithAuthFnOpts } from './lib/get_axios_instance';
export interface PluginSetupContract {
    registerType<Config extends ActionTypeConfig = ActionTypeConfig, Secrets extends ActionTypeSecrets = ActionTypeSecrets, Params extends ActionTypeParams = ActionTypeParams, ExecutorResultData = void>(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>): void;
    registerSubActionConnectorType<Config extends ActionTypeConfig = ActionTypeConfig, Secrets extends ActionTypeSecrets = ActionTypeSecrets>(connector: SubActionConnectorType<Config, Secrets>): void;
    getAxiosInstanceWithAuth(opts: GetAxiosInstanceWithAuthFnOpts): Promise<AxiosInstance>;
    isPreconfiguredConnector(connectorId: string): boolean;
    getSubActionConnectorClass: <Config, Secrets>() => IServiceAbstract<Config, Secrets>;
    getCaseConnectorClass: <Config, Secrets, Incident, GetIncidentResponse>() => ICaseServiceAbstract<Config, Secrets, Incident, GetIncidentResponse>;
    getActionsHealth: () => {
        hasPermanentEncryptionKey: boolean;
    };
    getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
    setEnabledConnectorTypes: (connectorTypes: EnabledConnectorTypes) => void;
    isActionTypeEnabled(id: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    registerConnectorLifecycleListener(listener: ConnectorLifecycleListener): void;
}
export interface PluginStartContract {
    isActionTypeEnabled(id: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    isActionExecutable(actionId: string, actionTypeId: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    getAllTypes: ActionTypeRegistry['getAllTypes'];
    listTypes(featureId?: string): ReturnType<ActionTypeRegistry['list']>;
    getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;
    /**
     * Returns an ActionsClient that is bound to the provided spaceId (namespace) while preserving
     * the original request (and its auth context).
     *
     * This enables space-agnostic consumers to manage/execute connectors in a fixed space
     * without forging fake requests (which can break auth under UIAM).
     */
    getActionsClientWithRequestInSpace(request: KibanaRequest, spaceId: string): Promise<PublicMethodsOf<ActionsClient>>;
    getActionsAuthorizationWithRequest(request: KibanaRequest): PublicMethodsOf<ActionsAuthorization>;
    inMemoryConnectors: InMemoryConnector[];
    getUnsecuredActionsClient(): IUnsecuredActionsClient;
    renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(actionTypeId: string, actionId: string, params: Params, variables: Record<string, unknown>): Params;
    isSystemActionConnector: (connectorId: string) => boolean;
    /**
     * Add a new dynamic InMemoryConnector to the inMemoryConnectors list if a connector with the id doesn't already exist.
     * @param connector to add to the inMemoryConnectors list
     * @returns boolean indicating whether the connector was added or not
     */
    registerDynamicConnector: (connector: InMemoryConnector) => boolean;
    /**
     * Remove a previously registered dynamic InMemoryConnector from the inMemoryConnectors list.
     * Only connectors flagged as dynamic (via registerDynamicConnector) can be removed this way;
     * preconfigured or system connectors are left untouched.
     * @param connectorId id of the dynamic connector to remove
     * @returns boolean indicating whether the connector was removed or not
     */
    unregisterDynamicConnector: (connectorId: string) => boolean;
}
export interface ActionsPluginsSetup {
    taskManager: TaskManagerSetupContract;
    encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
    licensing: LicensingPluginSetup;
    eventLog: IEventLogService;
    usageCollection?: UsageCollectionSetup;
    security?: SecurityPluginSetup;
    features: FeaturesPluginSetup;
    spaces?: SpacesPluginSetup;
    monitoringCollection?: MonitoringCollectionSetup;
    serverless?: ServerlessPluginSetup;
    cloud: CloudSetup;
    usageApi?: UsageApiSetup;
}
export interface ActionsPluginsStart {
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    taskManager: TaskManagerStartContract;
    licensing: LicensingPluginStart;
    eventLog: IEventLogClientService;
    spaces?: SpacesPluginStart;
    security?: SecurityPluginStart;
    serverless?: ServerlessPluginStart;
}
export declare class ActionsPlugin implements Plugin<PluginSetupContract, PluginStartContract, ActionsPluginsSetup, ActionsPluginsStart> {
    private readonly logger;
    private readonly actionsConfig;
    private taskRunnerFactory?;
    private actionTypeRegistry?;
    private authTypeRegistry?;
    private actionExecutor?;
    private licenseState;
    private security?;
    private spaces?;
    private eventLogService?;
    private eventLogger?;
    private isESOCanEncrypt?;
    private usageCounter?;
    private readonly telemetryLogger;
    private inMemoryConnectors;
    private inMemoryMetrics;
    private connectorUsageReportingTask;
    private connectorLifecycleListeners;
    private skippedPreconfiguredConnectorIds;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<ActionsPluginsStart, PluginStartContract>, plugins: ActionsPluginsSetup): PluginSetupContract;
    start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract;
    private getUnsecuredSavedObjectsClient;
    private getUnsecuredSavedObjectsClientWithFakeRequest;
    private instantiateAuthorization;
    private getServicesFactory;
    private getUnsecuredServicesFactory;
    private getInMemoryConnectors;
    private setSystemActions;
    private detectPreconfiguredConflicts;
    private throwIfSystemActionsInConfig;
    private createRouteHandlerContext;
    private validateEnabledConnectorTypes;
    private getAxiosInstanceWithAuthHelper;
    private registerDynamicConnector;
    private unregisterDynamicConnector;
    stop(): void;
}
export declare function renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(logger: Logger, actionTypeRegistry: ActionTypeRegistry | undefined, actionTypeId: string, actionId: string, params: Params, variables: Record<string, unknown>): Params;
