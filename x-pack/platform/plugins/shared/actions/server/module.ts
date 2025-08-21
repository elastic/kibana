/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable, inject } from 'inversify';
import type {
  Logger,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsBulkGetObject,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import type { IEventLogService, IEventLogger } from '@kbn/event-log-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { ActionsConfig } from './config';
import { AllowedHosts } from './config';
import type { InMemoryMetrics } from './monitoring';
import type { InMemoryConnector, PluginSetupContract, PluginStartContract } from '.';
import { UnsecuredActionsClient } from '.';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import type {
  ActionExecutionSource,
  ILicenseState,
  ActionExecutor,
  TaskRunnerFactory,
} from './lib';
import { spaceIdToNamespace } from './lib';
import { getActionsConfigurationUtilities } from './actions_config';
import type { ActionTypeRegistry } from './action_type_registry';

import type {
  ActionTypeParams,
  ActionsPluginSetupDeps,
  ActionsPluginStartDeps,
  Services,
  UnsecuredServices,
} from './types';
import { ActionsClient } from './actions_client';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { scheduleActionsTelemetry } from './usage/task';
import type { ConnectorUsageReportingTask } from './usage/connector_usage_reporting_task';
import { createSystemConnectors } from './create_system_actions';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import { renderMustacheObject } from './lib/mustache_renderer';
import type { ActionsPluginsStart } from './plugin';
import {
  ACTIONS_CONFIG,
  IN_MEMORY_CONNECTORS_SERVICE,
  IN_MEMORY_METRICS_SERVICE,
  LOGGER,
  TELEMETRY_LOGGER,
} from './constants';
import { ModuleSetup } from './module_setup';

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

@injectable()
export class Actions {
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
    @inject(LOGGER) private logger: Logger,
    @inject(TELEMETRY_LOGGER) private telemetryLogger: Logger,
    @inject(ACTIONS_CONFIG) private actionsConfig: ActionsConfig,
    @inject(IN_MEMORY_METRICS_SERVICE) private inMemoryMetrics: InMemoryMetrics,
    @inject(IN_MEMORY_CONNECTORS_SERVICE) private inMemoryConnectors: InMemoryConnector[]
  ) {}

  public setup({ plugins, core }: ActionsPluginSetupDeps): PluginSetupContract {
    const moduleSetup = new ModuleSetup({
      core,
      plugins,
      logger: this.logger,
      actionsConfig: this.actionsConfig,
      inMemoryMetrics: this.inMemoryMetrics,
      inMemoryConnectors: this.inMemoryConnectors,
      telemetryLogger: this.telemetryLogger,
    });
    this.licenseState = moduleSetup.licenseState!;
    this.isESOCanEncrypt = moduleSetup.isESOCanEncrypt!;
    this.eventLogService = moduleSetup.eventLogService!;
    this.eventLogger = moduleSetup.eventLogger!;
    this.taskRunnerFactory = moduleSetup.taskRunnerFactory!;
    this.actionTypeRegistry = moduleSetup.actionTypeRegistry!;
    this.actionExecutor = moduleSetup.actionExecutor!;
    this.security = plugins.security;

    return moduleSetup;
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
