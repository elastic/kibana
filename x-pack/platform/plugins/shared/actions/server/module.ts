import { injectable, inject } from 'inversify';
import { PluginInitializer } from '@kbn/core-di-server';
import type {
  Logger,
  LoggerFactory,
  PluginInitializerContext,
  EventTypeOpts,
  IContextProvider,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsBulkGetObject,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import { ActionsConfig, AllowedHosts, getValidatedConfig } from './config';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { InMemoryMetrics, registerClusterCollector, registerNodeCollector } from './monitoring';
import {
  ActionType,
  CaseConnector,
  InMemoryConnector,
  PluginSetupContract,
  PluginStartContract,
  SubActionConnector,
  UnsecuredActionsClient,
} from '.';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import {
  ActionExecutionSource,
  ActionExecutor,
  ILicenseState,
  LicenseState,
  TaskRunnerFactory,
  spaceIdToNamespace,
} from './lib';
import { ACTIONS_FEATURE } from './feature';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants/event_log';
import { GEN_AI_TOKEN_COUNT_EVENT } from './lib/event_based_telemetry';
import { IEventLogService, IEventLogger } from '@kbn/event-log-plugin/server';
import { ConnectorRateLimiter } from './lib/connector_rate_limiter';
import { ActionsConfigurationUtilities, getActionsConfigurationUtilities } from './actions_config';
import { getAlertHistoryEsIndex } from './preconfigured_connectors/alert_history_es_index/alert_history_es_index';
import { ACTIONS_FEATURE_ID, AlertHistoryEsIndexConnectorId } from '../common';
import { isConnectorDeprecated } from './application/connector/lib';
import { registerActionsUsageCollector } from './usage';
import { ActionTypeRegistry } from './action_type_registry';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { setupSavedObjects } from './saved_objects';

import type { ConnectorWithOptionalDeprecation } from './application/connector/lib';
import type {
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  ActionsPluginSetupDeps,
  ActionsPluginStartDeps,
  ActionsRequestHandlerContext,
  Services,
  UnsecuredServices,
} from './types';
import { ActionsClient } from './actions_client';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { initializeActionsTelemetry, scheduleActionsTelemetry } from './usage/task';
import { ConnectorUsageReportingTask } from './usage/connector_usage_reporting_task';
import { createSubActionConnectorFramework } from './sub_action_framework';
import { defineRoutes } from './routes';
import { ensureSufficientLicense } from './lib/ensure_sufficient_license';
import { SubActionConnectorType } from './sub_action_framework/types';
import { createSystemConnectors } from './create_system_actions';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import { renderMustacheObject } from './lib/mustache_renderer';
import { ServerlessPluginStart } from '@kbn/serverless/server';
import { ActionsPluginsStart } from './plugin';

type Config = PluginInitializerContext<ActionsConfig>['config'];

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

@injectable()
export class Actions {
  private readonly logger: Logger;
  private readonly telemetryLogger: Logger;
  private readonly actionsConfig: ActionsConfig;
  private inMemoryMetrics: InMemoryMetrics;
  private inMemoryConnectors: InMemoryConnector[];
  private licenseState: ILicenseState | null = null;
  private isESOCanEncrypt?: boolean;
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private security?: SecurityPluginSetup;
  private usageCounter?: UsageCounter;
  private connectorUsageReportingTask: ConnectorUsageReportingTask | undefined;

  constructor(
    @inject(PluginInitializer('logger')) private loggerFactory: LoggerFactory,
    @inject(PluginInitializer('config')) private config: Config
  ) {
    this.logger = this.loggerFactory.get();
    this.telemetryLogger = this.loggerFactory.get('usage');

    this.actionsConfig = getValidatedConfig(
      this.logger,
      resolveCustomHosts(this.logger, this.config.get<ActionsConfig>())
    );

    this.inMemoryConnectors = [];
    this.inMemoryMetrics = new InMemoryMetrics(this.loggerFactory.get('in_memory_metrics'));
  }

  public setup({ plugins, core }: ActionsPluginSetupDeps): PluginSetupContract {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    plugins.features.registerKibanaFeature(ACTIONS_FEATURE);
    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

    const actionExecutor = new ActionExecutor({
      isESOCanEncrypt: this.isESOCanEncrypt,
      connectorRateLimiter: new ConnectorRateLimiter({ config: this.actionsConfig.rateLimiter }),
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor, this.inMemoryMetrics);
    const actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      this.inMemoryConnectors.push(getAlertHistoryEsIndex());
    }

    for (const preconfiguredId of Object.keys(this.actionsConfig.preconfigured)) {
      if (preconfiguredId !== AlertHistoryEsIndexConnectorId) {
        const rawPreconfiguredConnector: ConnectorWithOptionalDeprecation = {
          ...this.actionsConfig.preconfigured[preconfiguredId],
          id: preconfiguredId,
          isPreconfigured: true,
          isSystemAction: false,
        };

        this.inMemoryConnectors.push({
          ...rawPreconfiguredConnector,
          isDeprecated: isConnectorDeprecated(rawPreconfiguredConnector),
        });
      } else {
        this.logger.warn(
          `Preconfigured connectors cannot have the id "${AlertHistoryEsIndexConnectorId}" because this is a reserved id.`
        );
      }
    }

    const actionTypeRegistry = new ActionTypeRegistry({
      licensing: plugins.licensing,
      taskRunnerFactory,
      taskManager: plugins.taskManager,
      actionsConfigUtils,
      licenseState: this.licenseState,
      inMemoryConnectors: this.inMemoryConnectors,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.actionExecutor = actionExecutor;
    this.security = plugins.security;

    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.actionTypeRegistry!,
      plugins.taskManager.index,
      this.inMemoryConnectors
    );

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

      this.connectorUsageReportingTask = new ConnectorUsageReportingTask({
        logger: this.logger,
        eventLogIndex,
        core,
        taskManager: plugins.taskManager,
        projectId: plugins.cloud.serverless.projectId,
        config: this.actionsConfig.usage,
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

    const subActionFramework = createSubActionConnectorFramework({
      actionTypeRegistry,
      logger: this.logger,
      actionsConfigUtils,
    });

    // Routes
    defineRoutes({
      router: core.http.createRouter<ActionsRequestHandlerContext>(),
      licenseState: this.licenseState,
      actionsConfigUtils,
      usageCounter: this.usageCounter,
    });

    return {
      registerType: <
        Config extends ActionTypeConfig = ActionTypeConfig,
        Secrets extends ActionTypeSecrets = ActionTypeSecrets,
        Params extends ActionTypeParams = ActionTypeParams,
        ExecutorResultData = void
      >(
        actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
      ) => {
        ensureSufficientLicense(actionType);
        actionTypeRegistry.register(actionType);
      },
      registerSubActionConnectorType: <
        Config extends ActionTypeConfig = ActionTypeConfig,
        Secrets extends ActionTypeSecrets = ActionTypeSecrets
      >(
        connector: SubActionConnectorType<Config, Secrets>
      ) => {
        subActionFramework.registerConnector(connector);
      },
      isPreconfiguredConnector: (connectorId: string): boolean => {
        return !!this.inMemoryConnectors.find(
          (inMemoryConnector) =>
            inMemoryConnector.isPreconfigured && inMemoryConnector.id === connectorId
        );
      },
      getSubActionConnectorClass: () => SubActionConnector,
      getCaseConnectorClass: () => CaseConnector,
      getActionsHealth: () => {
        return {
          hasPermanentEncryptionKey: plugins.encryptedSavedObjects.canEncrypt,
        };
      },
      getActionsConfigurationUtilities: () => actionsConfigUtils,
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
    };
  }

  public start({ plugins, core }: ActionsPluginStartDeps): PluginStartContract {
    const {
      logger,
      licenseState,
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      isESOCanEncrypt,
      instantiateAuthorization,
      getUnsecuredSavedObjectsClient,
      actionsConfig,
    } = this;

    const actionsConfigUtils = getActionsConfigurationUtilities(actionsConfig);

    licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes,
    });

    this.throwIfSystemActionsInConfig();

    /**
     * Warning: this call mutates the inMemory collection
     *
     * Warning: it maybe possible for the task manager to start before
     * the system actions are being set.
     *
     * Issue: https://github.com/elastic/kibana/issues/160797
     */
    this.setSystemActions();

    const getActionsClientWithRequest = async (
      request: KibanaRequest,
      authorizationContext?: ActionExecutionSource<unknown>
    ) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }

      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        core.savedObjects,
        request
      );

      return new ActionsClient({
        logger,
        unsecuredSavedObjectsClient,
        actionTypeRegistry: actionTypeRegistry!,
        kibanaIndices: core.savedObjects.getAllIndices(),
        scopedClusterClient: core.elasticsearch.client.asScoped(request),
        inMemoryConnectors: this.inMemoryConnectors,
        request,
        authorization: instantiateAuthorization(request),
        actionExecutor: actionExecutor!,
        bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: actionTypeRegistry!,
          isESOCanEncrypt: isESOCanEncrypt!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
          logger,
        }),
        auditLogger: this.security?.audit.asScoped(request),
        usageCounter: this.usageCounter,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient,
          encryptedSavedObjectsClient,
          logger,
        }),
        getEventLogClient: async () => {
          return plugins.eventLog.getClient(request);
        },
      });
    };

    const getUnsecuredActionsClient = () => {
      const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
        ACTION_SAVED_OBJECT_TYPE,
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]);

      return new UnsecuredActionsClient({
        actionExecutor: actionExecutor!,
        clusterClient: core.elasticsearch.client,
        executionEnqueuer: createBulkUnsecuredExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          connectorTypeRegistry: actionTypeRegistry!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
        }),
        inMemoryConnectors: this.inMemoryConnectors,
        internalSavedObjectsRepository,
        kibanaIndices: core.savedObjects.getAllIndices(),
        logger: this.logger,
      });
    };

    const secureGetActionsClientWithRequest = (request: KibanaRequest) =>
      getActionsClientWithRequest(request);

    this.eventLogService!.registerSavedObjectProvider('action', (request) => {
      const client = secureGetActionsClientWithRequest(request);
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

    const getScopedSavedObjectsClientWithoutAccessToActions = (request: KibanaRequest) =>
      core.savedObjects.getScopedClient(request);

    const getInternalSavedObjectsRepositoryWithoutAccessToActions = () =>
      core.savedObjects.createInternalRepository();

    actionExecutor!.initialize({
      logger,
      eventLogger: this.eventLogger!,
      spaces: plugins.spaces?.spacesService,
      security: core.security,
      getServices: this.getServicesFactory(
        getScopedSavedObjectsClientWithoutAccessToActions,
        core.elasticsearch,
        encryptedSavedObjectsClient,
        (request: KibanaRequest) => this.getUnsecuredSavedObjectsClient(core.savedObjects, request)
      ),
      getUnsecuredServices: this.getUnsecuredServicesFactory(
        getInternalSavedObjectsRepositoryWithoutAccessToActions,
        core.elasticsearch,
        encryptedSavedObjectsClient,
        () => this.getUnsecuredSavedObjectsClientWithFakeRequest(core.savedObjects)
      ),
      encryptedSavedObjectsClient,
      actionTypeRegistry: actionTypeRegistry!,
      inMemoryConnectors: this.inMemoryConnectors,
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return instantiateAuthorization(request);
      },
      analyticsService: core.analytics,
    });

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      spaceIdToNamespace: (spaceId?: string) => spaceIdToNamespace(plugins.spaces, spaceId),
      savedObjectsRepository: core.savedObjects.createInternalRepository([
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]),
    });

    this.eventLogService!.isEsContextReady()
      .then(() => {
        scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);
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
      isActionTypeEnabled: (id, options = { notifyUsage: false }) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
      },
      isActionExecutable: (
        actionId: string,
        actionTypeId: string,
        options = { notifyUsage: false }
      ) => {
        return this.actionTypeRegistry!.isActionExecutable(actionId, actionTypeId, options);
      },
      getAllTypes: actionTypeRegistry!.getAllTypes.bind(actionTypeRegistry),
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return instantiateAuthorization(request);
      },
      getActionsClientWithRequest: secureGetActionsClientWithRequest,
      getUnsecuredActionsClient,
      inMemoryConnectors: this.inMemoryConnectors,
      renderActionParameterTemplates: (...args) =>
        renderActionParameterTemplates(this.logger, actionTypeRegistry, ...args),
      isSystemActionConnector: (connectorId: string): boolean => {
        return this.inMemoryConnectors.some(
          (inMemoryConnector) =>
            inMemoryConnector.isSystemAction && inMemoryConnector.id === connectorId
        );
      },
    };
  }

  private createRouteHandlerContext = (
    core: ActionsPluginSetupDeps['core'],
    actionsConfigUtils: ActionsConfigurationUtilities
  ): IContextProvider<ActionsRequestHandlerContext, 'actions'> => {
    const {
      actionTypeRegistry,
      isESOCanEncrypt,
      getInMemoryConnectors,
      actionExecutor,
      instantiateAuthorization,
      security,
      usageCounter,
      logger,
    } = this;

    return async function actionsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { taskManager, encryptedSavedObjects, eventLog }] =
        await core.getStartServices();

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
          return new ActionsClient({
            logger,
            unsecuredSavedObjectsClient,
            actionTypeRegistry: actionTypeRegistry!,
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
              encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
                includedHiddenTypes,
              }),
              logger,
            }),
            async getEventLogClient() {
              return eventLog.getClient(request);
            },
          });
        },
        listTypes: actionTypeRegistry!.list.bind(actionTypeRegistry!),
      };
    };
  };

  private getInMemoryConnectors = () => this.inMemoryConnectors;

  private instantiateAuthorization = (request: KibanaRequest) => {
    return new ActionsAuthorization({
      request,
      authorization: this.security?.authz,
    });
  };

  private throwIfSystemActionsInConfig = () => {
    const hasSystemActionAsPreconfiguredInConfig = this.inMemoryConnectors
      .filter((connector) => connector.isPreconfigured)
      .some((connector) => this.actionTypeRegistry!.isSystemActionType(connector.actionTypeId));

    if (hasSystemActionAsPreconfiguredInConfig) {
      throw new Error('Setting system action types in preconfigured connectors are not allowed');
    }
  };

  private setSystemActions = () => {
    const systemConnectors = createSystemConnectors(this.actionTypeRegistry?.list() ?? []);
    this.inMemoryConnectors = [...this.inMemoryConnectors, ...systemConnectors];
  };

  private getUnsecuredSavedObjectsClient = (
    savedObjects: SavedObjectsServiceStart,
    request: KibanaRequest
  ) =>
    savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });

  // replace when https://github.com/elastic/kibana/issues/209413 is resolved
  private getUnsecuredSavedObjectsClientWithFakeRequest = (
    savedObjects: SavedObjectsServiceStart
  ) => {
    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;
    return savedObjects.getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });
  };

  private getServicesFactory(
    getScopedClient: (request: KibanaRequest) => SavedObjectsClientContract,
    elasticsearch: ElasticsearchServiceStart,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    unsecuredSavedObjectsClient: (request: KibanaRequest) => SavedObjectsClientContract
  ): (request: KibanaRequest) => Services {
    return (request) => {
      return {
        savedObjectsClient: getScopedClient(request),
        scopedClusterClient: elasticsearch.client.asScoped(request).asCurrentUser,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient: unsecuredSavedObjectsClient(request),
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      };
    };
  }

  private getUnsecuredServicesFactory(
    getSavedObjectRepository: () => ISavedObjectsRepository,
    elasticsearch: ElasticsearchServiceStart,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    unsecuredSavedObjectsRepository: () => SavedObjectsClientContract
  ): () => UnsecuredServices {
    return () => {
      return {
        savedObjectsClient: getSavedObjectRepository(),
        scopedClusterClient: elasticsearch.client.asInternalUser,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient: unsecuredSavedObjectsRepository(),
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      };
    };
  }

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
}

export const events: Array<EventTypeOpts<{ [key: string]: unknown }>> = [GEN_AI_TOKEN_COUNT_EVENT];

export function renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
  logger: Logger,
  actionTypeRegistry: ActionTypeRegistry | undefined,
  actionTypeId: string,
  actionId: string,
  params: Params,
  variables: Record<string, unknown>
): Params {
  const actionType = actionTypeRegistry?.get(actionTypeId);
  if (actionType?.renderParameterTemplates) {
    return actionType.renderParameterTemplates(logger, params, variables, actionId) as Params;
  } else {
    return renderMustacheObject(logger, params, variables);
  }
}
