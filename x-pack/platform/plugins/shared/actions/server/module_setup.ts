/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEventLogService, IEventLogger } from '@kbn/event-log-plugin/server';
import {
  type Logger,
  type EventTypeOpts,
  type IContextProvider,
  type KibanaRequest,
  SECURITY_EXTENSION_ID,
} from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { inject, injectable, optional } from 'inversify';
import { PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer } from '@kbn/core-di-server';
import type { ActionType, PluginSetupContract } from '.';
import { CaseConnector, SubActionConnector } from '.';
import { ActionExecutor, LicenseState, TaskRunnerFactory } from './lib';
import type { ILicenseState } from './lib';
import type {
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  ActionsPluginSetupDeps,
  ActionsRequestHandlerContext,
  InMemoryConnector,
} from './types';
import { ACTIONS_FEATURE } from './feature';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants/event_log';
import { GEN_AI_TOKEN_COUNT_EVENT } from './lib/event_based_telemetry';
import { ConnectorRateLimiter } from './lib/connector_rate_limiter';
import type { ActionsConfig, EnabledConnectorTypes } from './config';
import { InMemoryMetrics, registerClusterCollector, registerNodeCollector } from './monitoring';
import type { ActionsConfigurationUtilities } from './actions_config';
import { getActionsConfigurationUtilities } from './actions_config';
import { getAlertHistoryEsIndex } from './preconfigured_connectors/alert_history_es_index/alert_history_es_index';
import type { ConnectorWithOptionalDeprecation } from './application/connector/lib';
import { ACTIONS_FEATURE_ID, AlertHistoryEsIndexConnectorId } from '../common';
import { isConnectorDeprecated } from './application/connector/lib';
import { ActionTypeRegistry } from './action_type_registry';
import { setupSavedObjects } from './saved_objects';
import { registerActionsUsageCollector } from './usage';
import { initializeActionsTelemetry } from './usage/task';
import { ConnectorUsageReportingTask } from './usage/connector_usage_reporting_task';
import { ActionsAuthorization } from './authorization/actions_authorization';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import { ActionsClient } from './actions_client';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { createSubActionConnectorFramework } from './sub_action_framework';
import { defineRoutes } from './routes';
import { ensureSufficientLicense } from './lib/ensure_sufficient_license';
import type { SubActionConnectorType } from './sub_action_framework/types';
import { AllowedHosts } from './config';
import { ACTIONS_CONFIG, IN_MEMORY_CONNECTORS_SERVICE } from './constants';

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

@injectable()
export class ModuleSetup implements PluginSetupContract {
  public logger: Logger;
  public telemetryLogger: Logger;
  public licenseState: ILicenseState | null = null;
  public isESOCanEncrypt?: boolean;
  public eventLogService?: IEventLogService;
  public eventLogger?: IEventLogger;
  public actionExecutor?: ActionExecutor;
  public taskRunnerFactory?: TaskRunnerFactory;
  public actionsConfigUtils?: ActionsConfigurationUtilities;
  public actionTypeRegistry?: ActionTypeRegistry;
  public connectorUsageReportingTask?: ConnectorUsageReportingTask | undefined;
  public usageCounter?: UsageCounter;
  public inMemoryMetrics?: InMemoryMetrics;
  private subActionFramework: {
    registerConnector: <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>(
      connector: SubActionConnectorType<Config, Secrets>
    ) => void;
  };

  constructor(
    @inject(PluginInitializer('logger')) private loggerFactory: Logger,
    @inject(ACTIONS_CONFIG) private actionsConfig: ActionsConfig,
    @inject(IN_MEMORY_CONNECTORS_SERVICE) private inMemoryConnectors: InMemoryConnector[],
    @inject(CoreSetup('http')) private http: ActionsPluginSetupDeps['core']['http'],
    @inject(CoreSetup('analytics')) private analytics: ActionsPluginSetupDeps['core']['analytics'],
    @inject(CoreSetup('savedObjects'))
    private savedObjects: ActionsPluginSetupDeps['core']['savedObjects'],
    @inject(CoreSetup('getStartServices'))
    private getStartServices: ActionsPluginSetupDeps['core']['getStartServices'],
    @inject(PluginSetup('licensing'))
    private licensing: ActionsPluginSetupDeps['plugins']['licensing'],
    @inject(PluginSetup('security')) public security: ActionsPluginSetupDeps['plugins']['security'],
    @inject(PluginSetup('features'))
    private features: ActionsPluginSetupDeps['plugins']['features'],
    @inject(PluginSetup('eventLog'))
    private eventLog: ActionsPluginSetupDeps['plugins']['eventLog'],
    @inject(PluginSetup('encryptedSavedObjects'))
    private encryptedSavedObjects: ActionsPluginSetupDeps['plugins']['encryptedSavedObjects'],
    @inject(PluginSetup('taskManager'))
    private taskManagerPlugin: ActionsPluginSetupDeps['plugins']['taskManager'],
    @inject(PluginSetup('usageCollection'))
    private usageCollection: ActionsPluginSetupDeps['plugins']['usageCollection'],
    @inject(PluginSetup('monitoringCollection'))
    private monitoringCollection: ActionsPluginSetupDeps['plugins']['monitoringCollection'],
    @inject(PluginSetup('cloud'))
    private cloud: ActionsPluginSetupDeps['plugins']['cloud'],
    @optional()
    @inject(PluginSetup('serverless'))
    private serverless: ActionsPluginSetupDeps['plugins']['serverless']
  ) {
    this.logger = this.loggerFactory.get();
    this.telemetryLogger = this.loggerFactory.get('usage');
    this.inMemoryMetrics = new InMemoryMetrics(this.loggerFactory.get('in_memory_metrics'));

    const plugins = {
      licensing: this.licensing,
      encryptedSavedObjects: this.encryptedSavedObjects,
      security: this.security,
      features: this.features,
      eventLog: this.eventLog,
      taskManager: this.taskManagerPlugin,
      usageCollection: this.usageCollection,
      monitoringCollection: this.monitoringCollection,
      cloud: this.cloud,
    };
    const core = {
      analytics: this.analytics,
      savedObjects: this.savedObjects,
      getStartServices: this.getStartServices,
      http: this.http,
    };

    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;
    // this.security = plugins.security;
    this.encryptedSavedObjects = plugins.encryptedSavedObjects;

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

    this.actionExecutor = new ActionExecutor({
      isESOCanEncrypt: this.isESOCanEncrypt,
      connectorRateLimiter: new ConnectorRateLimiter({ config: this.actionsConfig.rateLimiter }),
    });

    this.taskRunnerFactory = new TaskRunnerFactory(this.actionExecutor, this.inMemoryMetrics);

    this.actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

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

    this.actionTypeRegistry = new ActionTypeRegistry({
      licensing: plugins.licensing,
      taskRunnerFactory: this.taskRunnerFactory!,
      taskManager: plugins.taskManager,
      actionsConfigUtils: this.actionsConfigUtils,
      licenseState: this.licenseState,
      inMemoryConnectors: this.inMemoryConnectors,
    });

    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.actionTypeRegistry!,
      plugins.taskManager.index,
      this.inMemoryConnectors
    );

    if (plugins.usageCollection) {
      registerActionsUsageCollector(
        plugins.usageCollection,
        this.actionsConfig,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    core.http.registerRouteHandlerContext<ActionsRequestHandlerContext, 'actions'>(
      'actions',
      this.createRouteHandlerContext(core, this.actionsConfigUtils)
    );

    if (plugins.usageCollection) {
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

    this.subActionFramework = createSubActionConnectorFramework({
      actionTypeRegistry: this.actionTypeRegistry,
      logger: this.logger,
      actionsConfigUtils: this.actionsConfigUtils,
    });

    // Routes
    defineRoutes({
      router: core.http.createRouter<ActionsRequestHandlerContext>(),
      licenseState: this.licenseState,
      actionsConfigUtils: this.actionsConfigUtils,
      usageCounter: this.usageCounter,
    });
  }

  private getInMemoryConnectors = () => this.inMemoryConnectors;

  public instantiateAuthorization = (request: KibanaRequest) => {
    return new ActionsAuthorization({
      request,
      authorization: this.security?.authz,
    });
  };

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

  public registerType = <
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ) => {
    ensureSufficientLicense(actionType);
    this.actionTypeRegistry!.register(actionType);
  };

  public registerSubActionConnectorType = <
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets
  >(
    connector: SubActionConnectorType<Config, Secrets>
  ) => {
    this.subActionFramework.registerConnector(connector);
  };

  public isPreconfiguredConnector = (connectorId: string): boolean => {
    return !!this.inMemoryConnectors.find(
      (inMemoryConnector) =>
        inMemoryConnector.isPreconfigured && inMemoryConnector.id === connectorId
    );
  };
  public getSubActionConnectorClass = () => SubActionConnector;
  public getCaseConnectorClass = () => CaseConnector;
  public getActionsHealth = () => {
    return {
      hasPermanentEncryptionKey: this.encryptedSavedObjects.canEncrypt,
    };
  };

  public getActionsConfigurationUtilities = () => this.actionsConfigUtils!;

  public setEnabledConnectorTypes = (connectorTypes: EnabledConnectorTypes) => {
    if (
      this.serverless &&
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
  };
  public isActionTypeEnabled = (id: string, options = { notifyUsage: false }) => {
    return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
  };
}

export const events: Array<EventTypeOpts<{ [key: string]: unknown }>> = [GEN_AI_TOKEN_COUNT_EVENT];
