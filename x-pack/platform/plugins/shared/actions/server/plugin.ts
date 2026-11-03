/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf, Writable } from '@kbn/utility-types';
import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  IContextProvider,
  SavedObjectsBulkGetObject,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
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
import type { ConnectorSigningKey, CredentialAccessor } from '@kbn/connector-specs';
import type { SpaceId } from '@kbn/core-spaces-common';
import { type ActionsConfig, type EnabledConnectorTypes } from './config';
import { AllowedHosts, getValidatedConfig } from './config';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { ActionsClient } from './actions_client/actions_client';
import type { ActionTypeRegistry } from './action_type_registry';
import type { AuthTypeRegistry } from './auth_types';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { registerActionsUsageCollector } from './usage';
import type { ILicenseState } from './lib';
import type { ActionExecutor, LeasePool } from './lib';
import type {
  ActionType,
  InMemoryConnector,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionsRequestHandlerContext,
  ConnectorLifecycleListener,
} from './types';

import type { ActionsConfigurationUtilities } from './actions_config';

import { defineRoutes } from './routes';
import { setupInboundEvents, type ConnectorEventEmitter } from './inbound';
import { initializeActionsTelemetry, scheduleActionsTelemetry } from './usage/task';
import {
  initializeOAuthStateCleanupTask,
  scheduleOAuthStateCleanupTask,
} from './lib/oauth_state_cleanup_task';
import {
  initializeUserConnectorTokenCleanupTask,
  scheduleUserConnectorTokenCleanupTask,
} from './lib/user_connector_token_cleanup_task';
import {
  CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import { ACTIONS_FEATURE } from './feature';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { getCurrentUserProfileIdFromRequest } from './lib/get_current_user_profile_id';
import { actionsBridge } from './tasks/bridge';
import type { ActionsExecuteRuntime } from './tasks/runtime';
import { createActionsExecuteRuntime } from './tasks/runtime';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import { ACTIONS_FEATURE_ID } from '../common';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { registerClusterCollector, registerNodeCollector } from './monitoring';
import type {
  ICaseServiceAbstract,
  IServiceAbstract,
  SubActionConnectorType,
} from './sub_action_framework/types';
import type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
import { ConnectorUsageReportingTask } from './usage/connector_usage_reporting_task';
import { OAuthRateLimiter } from './lib/oauth_rate_limiter';
import { type RelayClientContract } from './lib/relay';
import type { GetAxiosInstanceWithAuthFnOpts, GetCredentialFnOpts } from './lib/get_axios_instance';
import type { InMemoryMetrics } from './monitoring';

export interface PluginSetupContract {
  registerType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;

  registerSubActionConnectorType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets
  >(
    connector: SubActionConnectorType<Config, Secrets>
  ): void;

  getAxiosInstanceWithAuth(opts: GetAxiosInstanceWithAuthFnOpts): Promise<AxiosInstance>;

  getCredential(opts: GetCredentialFnOpts): CredentialAccessor;

  /** Signs claims with the Kibana-managed key of a connector whose spec publishes keys. */
  getConnectorJwtSigner(
    connectorId: string,
    signingKey: ConnectorSigningKey
  ): (claims: Record<string, unknown>) => Promise<string>;

  /**
   * Process-wide pool for reusable, long-lived connector clients. Empty until a client
   * type is registered.
   */
  getClientLeasePool(): LeasePool<unknown>;

  isPreconfiguredConnector(connectorId: string): boolean;

  getSubActionConnectorClass: <Config, Secrets>() => IServiceAbstract<Config, Secrets>;
  getCaseConnectorClass: <Config, Secrets, Incident, GetIncidentResponse>() => ICaseServiceAbstract<
    Config,
    Secrets,
    Incident,
    GetIncidentResponse
  >;
  getActionsHealth: () => { hasPermanentEncryptionKey: boolean };
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
  getRelayClient: () => RelayClientContract | undefined;
  setEnabledConnectorTypes: (connectorTypes: EnabledConnectorTypes) => void;

  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;

  registerConnectorLifecycleListener(listener: ConnectorLifecycleListener): void;

  /**
   * Registers the single consumer that receives connector events from the public inbound hub.
   * Throws if an emitter is already registered (exactly one emitter is supported).
   */
  registerConnectorEventEmitter(emitter: ConnectorEventEmitter): void;
}

export interface PluginStartContract {
  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;

  isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options?: { notifyUsage: boolean }
  ): boolean;

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
  getActionsClientWithRequestInSpace(
    request: KibanaRequest,
    spaceId: SpaceId
  ): Promise<PublicMethodsOf<ActionsClient>>;

  getActionsAuthorizationWithRequest(request: KibanaRequest): PublicMethodsOf<ActionsAuthorization>;

  inMemoryConnectors: InMemoryConnector[];

  getUnsecuredActionsClient(): IUnsecuredActionsClient;

  renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
    actionTypeId: string,
    actionId: string,
    params: Params,
    variables: Record<string, unknown>
  ): Params;

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
   * Triggers client-pool eviction (fire-and-forget); cache keys are dropped before return so a
   * re-register of the same id cannot reuse a stale pooled client.
   * @param connectorId id of the dynamic connector to remove
   * @returns boolean indicating whether the connector was removed or not
   */
  unregisterDynamicConnector: (connectorId: string) => boolean;
  getRelayClient: () => RelayClientContract | undefined;

  /**
   * Returns the subset of `connectorIds` for which the current user holds a usable OAuth token:
   * unexpired, or refreshable with an unexpired refresh token.
   */
  getUsableUserOAuthConnectorIds: (
    request: KibanaRequest,
    connectorIds: string[]
  ) => Promise<Set<string>>;
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

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

export class ActionsPlugin
  implements
    Plugin<PluginSetupContract, PluginStartContract, ActionsPluginsSetup, ActionsPluginsStart>
{
  private readonly logger: Logger;
  private readonly actionsConfig: ActionsConfig;
  private runtime?: ActionsExecuteRuntime;
  private actionTypeRegistry?: ActionTypeRegistry;
  private authTypeRegistry?: AuthTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: ILicenseState | null = null;
  private security?: SecurityPluginSetup;
  private securityStart?: SecurityPluginStart;
  private spaces?: SpacesPluginSetup;
  private eventLogService?: IEventLogService;
  private isESOCanEncrypt?: boolean;
  private usageCounter?: UsageCounter;
  private readonly telemetryLogger: Logger;
  private inMemoryConnectors: InMemoryConnector[] = [];
  private inMemoryMetrics?: InMemoryMetrics;
  private connectorUsageReportingTask: ConnectorUsageReportingTask | undefined;
  private connectorLifecycleListeners: ConnectorLifecycleListener[] = [];
  private connectorEventEmitter?: ConnectorEventEmitter;
  private clientLeasePool?: LeasePool<unknown>;
  private relayClient?: RelayClientContract;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.actionsConfig = getValidatedConfig(
      this.logger,
      resolveCustomHosts(this.logger, initContext.config.get<ActionsConfig>())
    );
    this.telemetryLogger = initContext.logger.get('usage');
  }

  public setup(
    core: CoreSetup<ActionsPluginsStart, PluginStartContract>,
    plugins: ActionsPluginsSetup
  ): PluginSetupContract {
    plugins.features.registerKibanaFeature(ACTIONS_FEATURE);

    this.eventLogService = plugins.eventLog;
    const runtime = createActionsExecuteRuntime({
      logger: this.logger,
      config: this.actionsConfig,
      core,
      taskManager: plugins.taskManager,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      licensing: plugins.licensing,
      eventLog: plugins.eventLog,
      cloud: plugins.cloud,
      getSystemIdentity: () => this.securityStart?.authc.systemIdentity,
      canRunPrivilegedActionTypes: true,
    });
    this.runtime = runtime;
    this.licenseState = runtime.licenseState;
    this.isESOCanEncrypt = runtime.isESOCanEncrypt;
    this.inMemoryConnectors = runtime.inMemoryConnectors;
    this.inMemoryMetrics = runtime.inMemoryMetrics;
    this.clientLeasePool = runtime.clientLeasePool;
    this.relayClient = runtime.relayClient;
    this.actionTypeRegistry = runtime.actionTypeRegistry;
    this.authTypeRegistry = runtime.authTypeRegistry;
    this.actionExecutor = runtime.actionExecutor;
    this.security = plugins.security;
    this.spaces = plugins.spaces;
    const actionsConfigUtils = runtime.actionsConfigUtils;
    actionsBridge.setSetup(runtime.setup);

    includedHiddenTypes.push(USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE);

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerActionsUsageCollector(
        usageCollection,
        this.actionsConfig,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    core.http.registerRouteHandlerContext<ActionsRequestHandlerContext, 'actions'>(
      'actions',
      this.createRouteHandlerContext(core, actionsConfigUtils)
    );
    if (usageCollection) {
      const eventLogIndex = this.eventLogService.getIndexPattern();

      initializeActionsTelemetry(
        this.telemetryLogger,
        plugins.taskManager,
        core,
        this.getInMemoryConnectors,
        eventLogIndex
      );

      // We plan to remove the usage config from this plugin in the future in favor of the new Usage API plugin.
      let usageApiConfig: Writable<ActionsConfig['usage']> = {};
      if (plugins.usageApi?.config) {
        usageApiConfig.enabled = plugins.usageApi?.config?.enabled;
        usageApiConfig.url = plugins.usageApi?.config?.url;
        if (plugins.usageApi?.config?.tls?.ca) {
          // Normalize the CA path to the format expected by the ConnectorUsageReportingTask
          usageApiConfig.ca = { path: plugins.usageApi.config.tls.ca };
        }
      } else {
        // If no configuration is provided via the Usage API plugin, use the configuration from this plugin.
        usageApiConfig = this.actionsConfig.usage;
      }

      this.connectorUsageReportingTask = new ConnectorUsageReportingTask({
        logger: this.logger,
        eventLogIndex,
        core,
        taskManager: plugins.taskManager,
        projectId: plugins.cloud.serverless.projectId,
        config: usageApiConfig,
      });
    }

    // Usage counter for telemetry
    this.usageCounter = plugins.usageCollection?.createUsageCounter(ACTIONS_FEATURE_ID);

    if (plugins.monitoringCollection) {
      registerNodeCollector({
        monitoringCollection: plugins.monitoringCollection,
        inMemoryMetrics: this.inMemoryMetrics,
      });
      registerClusterCollector({
        monitoringCollection: plugins.monitoringCollection,
        core,
      });
    }

    initializeOAuthStateCleanupTask(this.logger, plugins.taskManager, core);
    initializeUserConnectorTokenCleanupTask(this.logger, plugins.taskManager, core);

    // Initialize OAuth rate limiter
    const oauthRateLimiter = new OAuthRateLimiter({
      config: this.actionsConfig.auth.oauth_authorization_code.rate_limits,
    });

    // Routes
    const router = core.http.createRouter<ActionsRequestHandlerContext>();
    const inboundEvents = setupInboundEvents({
      actionsConfigUtils,
      http: core.http,
      getStartServices: core.getStartServices,
      logger: this.logger,
      spaces: this.spaces,
      inMemoryConnectors: this.inMemoryConnectors,
      getConnectorEventEmitter: () => this.connectorEventEmitter,
    });
    defineRoutes({
      getSpaceId: (request) => this.spaces?.spacesService.getSpaceId(request) ?? 'default',
      router,
      licenseState: this.licenseState,
      actionsConfigUtils,
      usageCounter: this.usageCounter,
      logger: this.logger,
      core,
      oauthRateLimiter,
      inboundEvents,
    });

    return {
      ...runtime.setup,
      getActionsHealth: () => {
        return {
          hasPermanentEncryptionKey: plugins.encryptedSavedObjects.canEncrypt,
        };
      },
      setEnabledConnectorTypes: (connectorTypes) => {
        if (
          !!plugins.serverless &&
          this.actionsConfig.enabledActionTypes.length === 1 &&
          this.actionsConfig.enabledActionTypes[0] === AllowedHosts.Any
        ) {
          this.actionsConfig.enabledActionTypes.pop();
          this.actionsConfig.enabledActionTypes.push(...connectorTypes);
        } else {
          throw new Error(
            "Enabled connector types can be set only if they haven't already been set in the config"
          );
        }
      },
      isActionTypeEnabled: (id, options = { notifyUsage: false }) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
      },
      registerConnectorLifecycleListener: (listener: ConnectorLifecycleListener) => {
        this.connectorLifecycleListeners.push(listener);
      },
      registerConnectorEventEmitter: (emitter: ConnectorEventEmitter) => {
        if (this.connectorEventEmitter !== undefined) {
          throw new Error(
            'A connector event emitter is already registered; only one emitter is supported.'
          );
        }
        this.connectorEventEmitter = emitter;
      },
    };
  }

  public start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    this.securityStart = plugins.security;
    if (this.actionsConfig.relay?.uiam?.enabled && !plugins.security?.authc.systemIdentity) {
      this.logger.warn(
        '`xpack.actions.relay.uiam.enabled` is set but this Kibana has no UIAM system identity. Relay requests will fail until `xpack.security.uiam` is configured with a client certificate (`ssl.certificate` and `ssl.key`).'
      );
    }
    const runtime = this.runtime!;
    const rtStart = runtime.start({
      core,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      licensing: plugins.licensing,
      taskManager: plugins.taskManager,
      spaces: plugins.spaces,
      security: plugins.security,
      getAuthorization: () => this.security?.authz,
      getAuditLogger: (request) => this.security?.audit.asScoped(request),
      getEventLogClient: (request) => plugins.eventLog.getClient(request),
      usageCounter: this.usageCounter,
      connectorLifecycleListeners: this.connectorLifecycleListeners,
    });
    actionsBridge.setStart(rtStart.contract);
    const { contract } = rtStart;

    this.eventLogService!.registerSavedObjectProvider('action', (request) => {
      const client = contract.getActionsClientWithRequest(request);
      return (objects?: SavedObjectsBulkGetObject[]) =>
        objects
          ? Promise.all(
              objects.map(
                async (objectItem) =>
                  /**
                   * TODO: Change with getBulk
                   */
                  await (await client).get({ id: objectItem.id, throwIfSystemAction: false })
              )
            )
          : Promise.resolve([]);
    });

    this.eventLogService!.isEsContextReady()
      .then(() => {
        scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);
        scheduleOAuthStateCleanupTask(this.logger, plugins.taskManager);
        scheduleUserConnectorTokenCleanupTask(this.logger, plugins.taskManager);
      })
      .catch(() => {});

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      createAlertHistoryIndexTemplate({
        client: core.elasticsearch.client.asInternalUser,
        logger: this.logger,
      }).catch(() => {});
    }

    this.validateEnabledConnectorTypes(plugins);

    this.connectorUsageReportingTask?.start(plugins.taskManager).catch(() => {});

    return {
      ...contract,
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return rtStart.instantiateAuthorization(request);
      },
      getActionsClientWithRequestInSpace: rtStart.getActionsClientWithRequestInSpace,
      registerDynamicConnector: (connector: InMemoryConnector) =>
        rtStart.registerDynamicConnector(connector),
      unregisterDynamicConnector: (connectorId: string) =>
        rtStart.unregisterDynamicConnector(connectorId),
      getRelayClient: () => this.relayClient,
      getUsableUserOAuthConnectorIds: rtStart.getUsableUserOAuthConnectorIds,
    };
  }

  private instantiateAuthorization = (request: KibanaRequest) => {
    return new ActionsAuthorization({
      request,
      authorization: this.security?.authz,
    });
  };

  private getInMemoryConnectors = () => this.inMemoryConnectors;

  private createRouteHandlerContext = (
    core: CoreSetup<ActionsPluginsStart>,
    actionsConfigUtils: ActionsConfigurationUtilities
  ): IContextProvider<ActionsRequestHandlerContext, 'actions'> => {
    const {
      actionTypeRegistry,
      authTypeRegistry,
      isESOCanEncrypt,
      getInMemoryConnectors,
      actionExecutor,
      instantiateAuthorization,
      security,
      usageCounter,
      logger,
      getAxiosInstanceWithAuthHelper,
      spaces,
      connectorLifecycleListeners,
      actionsConfig,
    } = this;
    const getSkippedPreconfiguredIds = () => this.runtime!.getSkippedPreconfiguredConnectorIds();
    const evictClientPool = async (connectorId: string): Promise<void> => {
      await this.clientLeasePool!.evict(connectorId);
    };

    return async function actionsRouteHandlerContext(context, request) {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const { taskManager, encryptedSavedObjects, eventLog } = pluginsStart;
      const { savedObjects } = coreStart;

      const coreContext = await context.core;
      const inMemoryConnectors = getInMemoryConnectors();

      return {
        getActionsClient: () => {
          if (isESOCanEncrypt !== true) {
            throw new Error(
              `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
            );
          }
          const unsecuredSavedObjectsClient = savedObjects.getScopedClient(request, {
            excludedExtensions: [SECURITY_EXTENSION_ID],
            includedHiddenTypes,
          });
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes,
          });

          return new ActionsClient({
            publicBaseUrl: coreStart.http.basePath.publicBaseUrl,
            connectorSigningKeysEnabled: actionsConfig.connectorSigningKeys.enabled,
            logger,
            unsecuredSavedObjectsClient,
            actionTypeRegistry: actionTypeRegistry!,
            authTypeRegistry: authTypeRegistry!,
            kibanaIndices: savedObjects.getAllIndices(),
            scopedClusterClient: coreContext.elasticsearch.client,
            inMemoryConnectors,
            request,
            authorization: instantiateAuthorization(request),
            actionExecutor: actionExecutor!,
            bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
              taskManager,
              actionTypeRegistry: actionTypeRegistry!,
              isESOCanEncrypt: isESOCanEncrypt!,
              inMemoryConnectors,
              configurationUtilities: actionsConfigUtils,
              logger,
            }),
            auditLogger: security?.audit.asScoped(request),
            usageCounter,
            connectorTokenClient: new ConnectorTokenClient({
              unsecuredSavedObjectsClient,
              encryptedSavedObjectsClient,
              logger,
              configurationUtilities: actionsConfigUtils,
            }),
            async getEventLogClient() {
              return eventLog.getClient(request);
            },
            getAxiosInstanceWithAuth: getAxiosInstanceWithAuthHelper(actionsConfigUtils),
            spaces: spaces?.spacesService,
            isESOCanEncrypt: isESOCanEncrypt!,
            encryptedSavedObjectsClient,
            connectorLifecycleListeners,
            getCurrentUserProfileId: (requestWithAuth: KibanaRequest) =>
              getCurrentUserProfileIdFromRequest(requestWithAuth, pluginsStart.security, logger),
            evictClientPool,
            securityService: coreStart.security,
          });
        },
        listTypes: (featureId?: string) => {
          return actionTypeRegistry!.list({ featureId });
        },
        getSkippedPreconfiguredConnectorIds: getSkippedPreconfiguredIds,
      };
    };
  };

  private validateEnabledConnectorTypes = (plugins: ActionsPluginsStart) => {
    if (
      !!plugins.serverless &&
      this.actionsConfig.enabledActionTypes.length > 0 &&
      this.actionsConfig.enabledActionTypes[0] !== AllowedHosts.Any
    ) {
      this.actionsConfig.enabledActionTypes.forEach((connectorType) => {
        // Throws error if action type doesn't exist
        this.actionTypeRegistry?.get(connectorType);
      });
    }
  };

  private getAxiosInstanceWithAuthHelper = (
    actionsConfigUtils: ActionsConfigurationUtilities,
    cloud?: CloudSetup
  ) => this.runtime!.getAxiosInstanceWithAuthHelper(actionsConfigUtils, cloud);

  public stop() {
    this.runtime?.stop();
  }
}

export { renderActionParameterTemplates } from './lib/render_action_parameter_templates';
