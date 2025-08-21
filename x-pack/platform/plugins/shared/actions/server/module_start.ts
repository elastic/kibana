/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchServiceStart,
  ISavedObjectsRepository,
  KibanaRequest,
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID, type Logger } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { PluginStart, Setup } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type {
  ActionTypeParams,
  ActionsPluginStartDeps,
  InMemoryConnector,
  Services,
  UnsecuredServices,
} from './types';
import type { ActionsConfig } from './config';
import {
  ACTIONS_CONFIG,
  IN_MEMORY_CONNECTORS_SERVICE,
  LOGGER,
  TELEMETRY_LOGGER,
} from './constants';
import { UnsecuredActionsClient, type PluginStartContract } from '.';
import type { ModuleSetup } from './module_setup';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import { AllowedHosts, getActionsConfigurationUtilities } from './actions_config';
import { createSystemConnectors } from './create_system_actions';
import { spaceIdToNamespace } from './lib';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { ActionsClient } from './actions_client';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { scheduleActionsTelemetry } from './usage/task';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import type { ActionsPluginsStart } from './plugin';
import type { ActionTypeRegistry } from './action_type_registry';
import { renderMustacheObject } from './lib/mustache_renderer';

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

@injectable()
export class ModuleStart implements PluginStartContract {
  public getActionsClientWithRequest: PluginStartContract['getActionsClientWithRequest'];
  public getUnsecuredActionsClient: PluginStartContract['getUnsecuredActionsClient'];

  constructor(
    @inject(LOGGER) private logger: Logger,
    @inject(TELEMETRY_LOGGER) private telemetryLogger: Logger,
    @inject(ACTIONS_CONFIG) private actionsConfig: ActionsConfig,
    @inject(IN_MEMORY_CONNECTORS_SERVICE) public inMemoryConnectors: InMemoryConnector[],
    @inject(CoreStart('savedObjects'))
    private savedObjects: ActionsPluginStartDeps['core']['savedObjects'],
    @inject(CoreStart('elasticsearch'))
    private elasticsearch: ActionsPluginStartDeps['core']['elasticsearch'],
    @inject(CoreStart('security'))
    private security: ActionsPluginStartDeps['core']['security'],
    @inject(CoreStart('analytics'))
    private analytics: ActionsPluginStartDeps['core']['analytics'],
    @inject(CoreStart('http'))
    private http: ActionsPluginStartDeps['core']['http'],

    @inject(PluginStart('licensing'))
    private licensing: ActionsPluginStartDeps['plugins']['licensing'],
    @inject(PluginStart('taskManager'))
    private taskManager: ActionsPluginStartDeps['plugins']['taskManager'],
    @inject(PluginStart('encryptedSavedObjects'))
    private encryptedSavedObjects: ActionsPluginStartDeps['plugins']['encryptedSavedObjects'],
    @inject(PluginStart('eventLog'))
    private eventLog: ActionsPluginStartDeps['plugins']['eventLog'],
    @inject(PluginStart('spaces'))
    private spaces: ActionsPluginStartDeps['plugins']['spaces'],
    @inject(Setup) private setup: ModuleSetup
  ) {
    const plugins = {
      licensing: this.licensing,
      encryptedSavedObjects: this.encryptedSavedObjects,
      taskManager: this.taskManager,
      eventLog: this.eventLog,
      spaces: this.spaces,
    };

    const core = {
      savedObjects: this.savedObjects,
      elasticsearch: this.elasticsearch,
      security: this.security,
      analytics: this.analytics,
      http: this.http,
    };
    const actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

    this.setup.licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

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

    this.getActionsClientWithRequest = async (request: KibanaRequest) => {
      if (this.setup.isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }

      const unsecuredSavedObjectsClient = this.getUnsecuredSavedObjectsClient(
        core.savedObjects,
        request
      );

      return new ActionsClient({
        logger,
        unsecuredSavedObjectsClient,
        actionTypeRegistry: this.setup.actionTypeRegistry!,
        kibanaIndices: core.savedObjects.getAllIndices(),
        scopedClusterClient: core.elasticsearch.client.asScoped(request),
        inMemoryConnectors: this.inMemoryConnectors,
        request,
        authorization: this.setup.instantiateAuthorization(request),
        actionExecutor: this.setup.actionExecutor!,
        bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: this.setup.actionTypeRegistry!,
          isESOCanEncrypt: this.setup.isESOCanEncrypt!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
          logger,
        }),
        auditLogger: this.setup.security?.audit.asScoped(request),
        usageCounter: this.setup.usageCounter,
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

    this.getUnsecuredActionsClient = () => {
      const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
        ACTION_SAVED_OBJECT_TYPE,
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]);

      return new UnsecuredActionsClient({
        actionExecutor: this.setup.actionExecutor!,
        clusterClient: core.elasticsearch.client,
        executionEnqueuer: createBulkUnsecuredExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          connectorTypeRegistry: this.setup.actionTypeRegistry!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
        }),
        inMemoryConnectors: this.inMemoryConnectors,
        internalSavedObjectsRepository,
        kibanaIndices: core.savedObjects.getAllIndices(),
        logger: this.logger,
      });
    };

    this.setup.eventLogService!.registerSavedObjectProvider('action', (request) => {
      const client = this.getActionsClientWithRequest(request);
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

    this.setup.actionExecutor!.initialize({
      logger,
      eventLogger: this.setup.eventLogger!,
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
      actionTypeRegistry: this.setup.actionTypeRegistry!,
      inMemoryConnectors: this.inMemoryConnectors,
      getActionsAuthorizationWithRequest: (request: KibanaRequest) => {
        return this.setup.instantiateAuthorization(request);
      },
      analyticsService: core.analytics,
    });

    this.setup.taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: this.setup.actionTypeRegistry!,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      spaceIdToNamespace: (spaceId?: string) => spaceIdToNamespace(plugins.spaces, spaceId),
      savedObjectsRepository: core.savedObjects.createInternalRepository([
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]),
    });

    this.setup
      .eventLogService!.isEsContextReady()
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

    this.setup.connectorUsageReportingTask?.start(plugins.taskManager).catch(() => {});
  }

  private getUnsecuredSavedObjectsClient = (
    savedObjects: SavedObjectsServiceStart,
    request: KibanaRequest
  ) =>
    savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });

  private throwIfSystemActionsInConfig = () => {
    const hasSystemActionAsPreconfiguredInConfig = this.inMemoryConnectors
      .filter((connector) => connector.isPreconfigured)
      .some((connector) =>
        this.setup.actionTypeRegistry!.isSystemActionType(connector.actionTypeId)
      );

    if (hasSystemActionAsPreconfiguredInConfig) {
      throw new Error('Setting system action types in preconfigured connectors are not allowed');
    }
  };

  private setSystemActions = () => {
    const systemConnectors = createSystemConnectors(this.setup.actionTypeRegistry?.list() ?? []);
    this.inMemoryConnectors = [...this.inMemoryConnectors, ...systemConnectors];
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

  private validateEnabledConnectorTypes = (plugins: ActionsPluginsStart) => {
    if (
      !!plugins.serverless &&
      this.actionsConfig.enabledActionTypes.length > 0 &&
      this.actionsConfig.enabledActionTypes[0] !== AllowedHosts.Any
    ) {
      this.actionsConfig.enabledActionTypes.forEach((connectorType) => {
        // Throws error if action type doesn't exist
        this.setup.actionTypeRegistry?.get(connectorType);
      });
    }
  };

  public isActionTypeEnabled = (id: string, options = { notifyUsage: false }) => {
    return this.setup.actionTypeRegistry!.isActionTypeEnabled(id, options);
  };

  public isActionExecutable = (
    actionId: string,
    actionTypeId: string,
    options = { notifyUsage: false }
  ) => {
    return this.setup.actionTypeRegistry!.isActionExecutable(actionId, actionTypeId, options);
  };

  public getAllTypes = () => this.setup.actionTypeRegistry!.getAllTypes();

  public getActionsAuthorizationWithRequest = (request: KibanaRequest) => {
    return this.setup.instantiateAuthorization(request);
  };

  public renderActionParameterTemplates: PluginStartContract['renderActionParameterTemplates'] = (
    ...args
  ) => renderActionParameterTemplates(this.logger, this.setup.actionTypeRegistry, ...args);

  public isSystemActionConnector = (connectorId: string): boolean => {
    return this.inMemoryConnectors.some(
      (inMemoryConnector) =>
        inMemoryConnector.isSystemAction && inMemoryConnector.id === connectorId
    );
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
