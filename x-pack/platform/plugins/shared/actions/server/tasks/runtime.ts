/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';
import type {
  AnalyticsServiceSetup,
  CoreTasksStart,
  KibanaRequest,
  Logger,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { AxiosInstance } from 'axios';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ConnectorSigningKey } from '@kbn/connector-specs';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  AuditLogger,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ActionsAuthorization } from '../authorization/actions_authorization';
import { createBulkExecutionEnqueuerFunction } from '../create_execute_function';
import { createBulkUnsecuredExecutionEnqueuerFunction } from '../create_unsecured_execute_function';
import { ActionsClient } from '../actions_client/actions_client';
import { ActionTypeRegistry } from '../action_type_registry';
import { getActionsConfigurationUtilities } from '../actions_config';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { AuthTypeRegistry, registerAuthTypes } from '../auth_types';
import type { ActionsConfig } from '../config';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '../constants/event_log';
import { createSystemConnectors } from '../create_system_actions';
import { ensureSufficientLicense } from '../lib/ensure_sufficient_license';
import { ActionExecutor } from '../lib/action_executor';
import { ConnectorRateLimiter } from '../lib/connector_rate_limiter';
import { ConnectorTokenClient } from '../lib/connector_token_client';
import { createConnectorJwtSigner } from '../lib/connector_signing_keys';
import { events } from '../lib/event_based_telemetry';
import { getCurrentUserProfileIdFromRequest } from '../lib/get_current_user_profile_id';
import type {
  GetAxiosInstanceWithAuthFnOpts,
  GetCredentialFnOpts,
} from '../lib/get_axios_instance';
import { getAxiosInstanceWithAuth, getCredentialWithAuth } from '../lib/get_axios_instance';
import { LeasePool } from '../lib/lease_pool';
import { LicenseState } from '../lib/license_state';
import type { ILicenseState } from '../lib/license_state';
import { RelayClient } from '../lib/relay';
import type { RelayClientContract } from '../lib/relay';
import { spaceIdToNamespace } from '../lib/space_id_to_namespace';
import { TaskRunnerFactory } from '../lib/task_runner_factory';
import { InMemoryMetrics } from '../monitoring/in_memory_metrics';
import type { ConnectorWithOptionalDeprecation } from '../application/connector/lib';
import { isConnectorDeprecated } from '../application/connector/lib';
import { getAlertHistoryEsIndex } from '../preconfigured_connectors/alert_history_es_index/alert_history_es_index';
import { setupSavedObjects } from '../saved_objects';
import { createSubActionConnectorFramework } from '../sub_action_framework';
import { UserConnectorTokenClient } from '../lib/user_connector_token_client';
import { UnsecuredActionsClient } from '../unsecured_actions_client/unsecured_actions_client';
import { AlertHistoryEsIndexConnectorId } from '../../common';
import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  InMemoryConnector,
  Services,
  UnsecuredServices,
  ConnectorLifecycleListener,
} from '../types';
import type { SubActionConnectorType } from '../sub_action_framework/types';
import { SubActionConnector } from '../sub_action_framework/sub_action_connector';
import { CaseConnector } from '../sub_action_framework/case';
import { renderActionParameterTemplates } from '../lib/render_action_parameter_templates';
import type { PluginSetupContract, PluginStartContract } from '../plugin';

/** The members of the setup contract that a task runtime builds and any consumer of tasks uses. */
export type ActionsTasksSetup = Pick<
  PluginSetupContract,
  | 'registerType'
  | 'registerSubActionConnectorType'
  | 'getAxiosInstanceWithAuth'
  | 'getCredential'
  | 'getConnectorJwtSigner'
  | 'getClientLeasePool'
  | 'getActionsConfigurationUtilities'
  | 'getRelayClient'
  | 'isPreconfiguredConnector'
  | 'getSubActionConnectorClass'
  | 'getCaseConnectorClass'
>;

export type ActionsTasksStart = Pick<
  PluginStartContract,
  | 'getActionsClientWithRequest'
  | 'getUnsecuredActionsClient'
  | 'isActionTypeEnabled'
  | 'isActionExecutable'
  | 'getAllTypes'
  | 'listTypes'
  | 'inMemoryConnectors'
  | 'isSystemActionConnector'
  | 'renderActionParameterTemplates'
>;

export interface ActionsRuntimeSetupDeps {
  logger: Logger;
  /** Validated: `getValidatedConfig(logger, resolveCustomHosts(logger, rawConfig))`. */
  config: ActionsConfig;
  core: {
    savedObjects: Pick<SavedObjectsServiceSetup, 'registerType'>;
    analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>;
    getStartServices: () => Promise<
      [
        Pick<CoreTasksStart, 'savedObjects'>,
        { encryptedSavedObjects: Pick<EncryptedSavedObjectsPluginStart, 'getClient'> },
        unknown
      ]
    >;
  };
  taskManager: Pick<TaskManagerSetupContract, 'index' | 'registerTaskDefinitions'>;
  encryptedSavedObjects: Pick<
    EncryptedSavedObjectsPluginSetup,
    'canEncrypt' | 'registerType' | 'createMigration' | 'createModelVersion'
  >;
  licensing: Pick<LicensingPluginSetup, 'license$' | 'featureUsage'>;
  eventLog: Pick<IEventLogService, 'registerProviderActions' | 'getLogger'>;
  cloud?: CloudSetup;
  /** The UIAM system identity for the relay; absent where there is none, such as a task pod. */
  getSystemIdentity: () => NonNullable<SecurityPluginStart['authc']['systemIdentity']> | undefined;
  /**
   * Whether this process can check Kibana privileges. A task pod cannot, so connector types that
   * need them (system and sub-feature types) are not run there.
   */
  canRunPrivilegedActionTypes: boolean;
}

export interface ActionsRuntimeStartDeps {
  core: CoreTasksStart;
  encryptedSavedObjects: Pick<EncryptedSavedObjectsPluginStart, 'getClient'>;
  licensing: Pick<LicensingPluginStart, 'featureUsage'>;
  taskManager: TaskManagerStartContract;
  spaces?: Pick<SpacesPluginStart, 'spacesService'>;
  security?: Pick<SecurityPluginStart, 'userProfiles'>;
  /** The security plugin's authorization service; absent in a task pod. */
  getAuthorization: () => SecurityPluginSetup['authz'] | undefined;
  /** The security plugin's audit logger factory; absent in a task pod. */
  getAuditLogger?: (request: KibanaRequest) => AuditLogger | undefined;
  getEventLogClient?: IEventLogClientService['getClient'];
  usageCounter?: UsageCounter;
  connectorLifecycleListeners?: ConnectorLifecycleListener[];
}

/** What the plugin keeps from the runtime besides the contracts. */
export interface ActionsExecuteRuntime {
  actionTypeRegistry: ActionTypeRegistry;
  authTypeRegistry: AuthTypeRegistry;
  actionExecutor: ActionExecutor;
  taskRunnerFactory: TaskRunnerFactory;
  licenseState: ILicenseState;
  inMemoryConnectors: InMemoryConnector[];
  inMemoryMetrics: InMemoryMetrics;
  actionsConfigUtils: ActionsConfigurationUtilities;
  clientLeasePool: LeasePool<unknown>;
  relayClient?: RelayClientContract;
  isESOCanEncrypt: boolean;
  includedHiddenTypes: string[];
  getSkippedPreconfiguredConnectorIds: () => Set<string>;
  getAxiosInstanceWithAuthHelper: (
    utils: ActionsConfigurationUtilities,
    cloud?: CloudSetup
  ) => (opts: GetAxiosInstanceWithAuthFnOpts) => Promise<AxiosInstance>;
  setup: ActionsTasksSetup;
  start: (deps: ActionsRuntimeStartDeps) => ActionsRuntimeStart;
  stop: () => void;
}

export interface ActionsRuntimeStart {
  contract: ActionsTasksStart;
  instantiateAuthorization: (request: KibanaRequest) => ActionsAuthorization;
  getActionsClientWithRequestInSpace: PluginStartContract['getActionsClientWithRequestInSpace'];
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | undefined>;
  getUnsecuredSavedObjectsClient: (request: KibanaRequest) => SavedObjectsClientContract;
  getUsableUserOAuthConnectorIds: PluginStartContract['getUsableUserOAuthConnectorIds'];
  registerDynamicConnector: (connector: InMemoryConnector) => boolean;
  unregisterDynamicConnector: (connectorId: string) => boolean;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}

/**
 * Everything needed to execute connectors, and nothing that serves requests: the registry, the
 * executor and the task runner factory with the saved object types, event log provider and
 * preconfigured connectors they use. The Actions plugin builds it in Kibana and publishes the
 * result through the bridge; a task pod builds its own, so a connector runs the same code in both.
 */
export function createActionsExecuteRuntime(deps: ActionsRuntimeSetupDeps): ActionsExecuteRuntime {
  const { logger, config, core, cloud } = deps;
  const clientLeasePool = new LeasePool<unknown>(logger);
  const inMemoryMetrics = new InMemoryMetrics(logger.get('in_memory_metrics'));
  const inMemoryConnectors: InMemoryConnector[] = [];
  const connectorLifecycleListenersDefault: ConnectorLifecycleListener[] = [];
  const includedHiddenTypes = [
    ACTION_SAVED_OBJECT_TYPE,
    CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
    CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
    ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    ALERT_SAVED_OBJECT_TYPE,
    CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
    USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  ];
  let skippedPreconfiguredConnectorIds = new Set<string>();

  const licenseState = new LicenseState(deps.licensing.license$);
  const isESOCanEncrypt = deps.encryptedSavedObjects.canEncrypt;
  if (!isESOCanEncrypt) {
    logger.warn(
      'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );
  }

  deps.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
  const eventLogger = deps.eventLog.getLogger({ event: { provider: EVENT_LOG_PROVIDER } });
  events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

  const actionExecutor = new ActionExecutor({
    isESOCanEncrypt,
    connectorRateLimiter: new ConnectorRateLimiter({ config: config.rateLimiter }),
  });
  const taskRunnerFactory = new TaskRunnerFactory(actionExecutor, inMemoryMetrics);
  const actionsConfigUtils = getActionsConfigurationUtilities(config);
  const relayClient = config.relay
    ? new RelayClient({
        baseUrl: config.relay.url,
        configurationUtilities: actionsConfigUtils,
        logger: logger.get('relay-client'),
        useSystemIdentity: config.relay.uiam?.enabled ?? false,
        getSystemIdentity: deps.getSystemIdentity,
      })
    : undefined;

  if (config.preconfiguredAlertHistoryEsIndex) {
    inMemoryConnectors.push(getAlertHistoryEsIndex());
  }
  for (const preconfiguredId of Object.keys(config.preconfigured)) {
    if (preconfiguredId !== AlertHistoryEsIndexConnectorId) {
      const rawPreconfiguredConnector: ConnectorWithOptionalDeprecation = {
        ...config.preconfigured[preconfiguredId],
        id: preconfiguredId,
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
      };
      inMemoryConnectors.push({
        ...rawPreconfiguredConnector,
        isDeprecated: isConnectorDeprecated(rawPreconfiguredConnector),
        isConnectorTypeDeprecated: false,
      });
    } else {
      logger.warn(
        `Preconfigured connectors cannot have the id "${AlertHistoryEsIndexConnectorId}" because this is a reserved id.`
      );
    }
  }

  const actionTypeRegistry = new ActionTypeRegistry({
    licensing: deps.licensing,
    taskRunnerFactory,
    taskManager: deps.taskManager,
    actionsConfigUtils,
    licenseState,
    inMemoryConnectors,
    canRunPrivilegedActionTypes: deps.canRunPrivilegedActionTypes,
  });

  const authTypeRegistry = new AuthTypeRegistry();
  registerAuthTypes(authTypeRegistry);

  setupSavedObjects(
    core.savedObjects,
    deps.encryptedSavedObjects,
    actionTypeRegistry,
    deps.taskManager.index,
    inMemoryConnectors,
    async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.savedObjects.createInternalRepository([ACTION_SAVED_OBJECT_TYPE]);
    }
  );

  const subActionFramework = createSubActionConnectorFramework({
    actionTypeRegistry,
    logger,
    actionsConfigUtils,
  });

  const getAxiosInstanceWithAuthHelper = (
    utils: ActionsConfigurationUtilities,
    cloudSetup?: CloudSetup
  ) => {
    const getAxiosInstanceFn = getAxiosInstanceWithAuth({
      authTypeRegistry,
      cloud: cloudSetup,
      configurationUtilities: utils,
      logger,
    });
    return async (getAxiosParams: GetAxiosInstanceWithAuthFnOpts) =>
      await getAxiosInstanceFn(getAxiosParams);
  };

  const getCredentialHelper = (utils: ActionsConfigurationUtilities) =>
    getCredentialWithAuth({ authTypeRegistry, configurationUtilities: utils, logger });

  const setup: ActionsTasksSetup = {
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
    getAxiosInstanceWithAuth: getAxiosInstanceWithAuthHelper(actionsConfigUtils, cloud),
    getCredential: getCredentialHelper(actionsConfigUtils) as (
      opts: GetCredentialFnOpts
    ) => ReturnType<ReturnType<typeof getCredentialWithAuth>>,
    getConnectorJwtSigner: (connectorId: string, { jwtType }: ConnectorSigningKey) =>
      createConnectorJwtSigner({
        getEncryptedSavedObjectsClient: async () => {
          const [, { encryptedSavedObjects }] = await core.getStartServices();
          return encryptedSavedObjects.getClient({
            includedHiddenTypes: [CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE],
          });
        },
        getSavedObjectsRepository: async () => {
          const [coreStart] = await core.getStartServices();
          return coreStart.savedObjects.createInternalRepository([ACTION_SAVED_OBJECT_TYPE]);
        },
        connectorId,
        jwtType,
      }),
    getClientLeasePool: () => clientLeasePool,
    isPreconfiguredConnector: (connectorId: string): boolean =>
      !!inMemoryConnectors.find(
        (inMemoryConnector) =>
          inMemoryConnector.isPreconfigured && inMemoryConnector.id === connectorId
      ),
    getSubActionConnectorClass: () => SubActionConnector,
    getCaseConnectorClass: () => CaseConnector,
    getActionsConfigurationUtilities: () => actionsConfigUtils,
    getRelayClient: () => relayClient,
  };

  const getUnsecuredSavedObjectsClient = (
    savedObjects: CoreTasksStart['savedObjects'],
    request: KibanaRequest
  ) =>
    savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });

  // replace when https://github.com/elastic/kibana/issues/209413 is resolved
  const getUnsecuredSavedObjectsClientWithFakeRequest = (
    savedObjects: CoreTasksStart['savedObjects']
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

  const start = (startDeps: ActionsRuntimeStartDeps): ActionsRuntimeStart => {
    const { core: coreStart } = startDeps;
    const connectorLifecycleListeners =
      startDeps.connectorLifecycleListeners ?? connectorLifecycleListenersDefault;

    licenseState.setNotifyUsage(startDeps.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = startDeps.encryptedSavedObjects.getClient({
      includedHiddenTypes,
    });

    const hasSystemActionAsPreconfiguredInConfig = inMemoryConnectors
      .filter((connector) => connector.isPreconfigured)
      .some((connector) => actionTypeRegistry.isSystemActionType(connector.actionTypeId));
    if (hasSystemActionAsPreconfiguredInConfig) {
      throw new Error('Setting system action types in preconfigured connectors are not allowed');
    }

    /**
     * Warning: this call mutates the inMemory collection
     *
     * Warning: it maybe possible for the task manager to start before
     * the system actions are being set.
     *
     * Issue: https://github.com/elastic/kibana/issues/160797
     */
    inMemoryConnectors.push(...createSystemConnectors(actionTypeRegistry.list() ?? []));

    detectPreconfiguredConflicts();

    const instantiateAuthorization = (request: KibanaRequest) =>
      new ActionsAuthorization({ request, authorization: startDeps.getAuthorization() });

    const getCurrentUserProfileId = (requestWithAuth: KibanaRequest) =>
      getCurrentUserProfileIdFromRequest(requestWithAuth, startDeps.security, logger);

    const createActionsClient = async ({
      request,
      unsecuredSavedObjectsClient,
      spaceId,
    }: {
      request: KibanaRequest;
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      spaceId?: SpaceId;
    }) => {
      return new ActionsClient({
        publicBaseUrl: coreStart.http.basePath.publicBaseUrl,
        connectorSigningKeysEnabled: config.connectorSigningKeys.enabled,
        logger,
        unsecuredSavedObjectsClient,
        actionTypeRegistry,
        authTypeRegistry,
        kibanaIndices: coreStart.savedObjects.getAllIndices(),
        scopedClusterClient: coreStart.elasticsearch.client.asScoped(request),
        inMemoryConnectors,
        request,
        spaceId,
        authorization: instantiateAuthorization(request),
        actionExecutor,
        bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
          taskManager: startDeps.taskManager,
          actionTypeRegistry,
          isESOCanEncrypt,
          inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
          logger,
        }),
        auditLogger: startDeps.getAuditLogger?.(request),
        usageCounter: startDeps.usageCounter,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient,
          encryptedSavedObjectsClient,
          logger,
          configurationUtilities: actionsConfigUtils,
        }),
        async getEventLogClient() {
          if (!startDeps.getEventLogClient) {
            throw new Error('The event log client is not available in a task runtime');
          }
          return startDeps.getEventLogClient(request);
        },
        getAxiosInstanceWithAuth: getAxiosInstanceWithAuthHelper(actionsConfigUtils),
        spaces: startDeps.spaces?.spacesService,
        isESOCanEncrypt,
        encryptedSavedObjectsClient,
        connectorLifecycleListeners,
        getCurrentUserProfileId,
        evictClientPool: async (connectorId: string) => {
          await clientLeasePool.evict(connectorId);
        },
        securityService: coreStart.security,
      });
    };

    const throwIfCannotEncrypt = () => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }
    };

    const getActionsClientWithRequest = async (request: KibanaRequest) => {
      throwIfCannotEncrypt();
      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        coreStart.savedObjects,
        request
      );
      return await createActionsClient({ request, unsecuredSavedObjectsClient });
    };

    const getActionsClientWithRequestInSpace = async (request: KibanaRequest, spaceId: SpaceId) => {
      throwIfCannotEncrypt();
      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        coreStart.savedObjects,
        request
      ).asScopedToNamespace(spaceId);
      return await createActionsClient({ request, unsecuredSavedObjectsClient, spaceId });
    };

    const getUnsecuredActionsClient = () => {
      const internalSavedObjectsRepository = coreStart.savedObjects.createInternalRepository([
        ACTION_SAVED_OBJECT_TYPE,
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]);
      return new UnsecuredActionsClient({
        actionExecutor,
        clusterClient: coreStart.elasticsearch.client,
        executionEnqueuer: createBulkUnsecuredExecutionEnqueuerFunction({
          taskManager: startDeps.taskManager,
          connectorTypeRegistry: actionTypeRegistry,
          inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
        }),
        inMemoryConnectors,
        internalSavedObjectsRepository,
        kibanaIndices: coreStart.savedObjects.getAllIndices(),
        logger,
        connectorTypeRegistry: actionTypeRegistry,
      });
    };

    /**
     * Resolves profile UID from the `Authorization` API-key header for callers that run under a
     * `FakeRequest` (action executor / background execution), where there is no browser session
     * and `userProfiles.getCurrent` cannot run. For real `KibanaRequest` traffic, use
     * `getCurrentUserProfileIdFromRequest` instead.
     */
    async function getCurrentUserProfileIdFromAPIKey(
      request: KibanaRequest
    ): Promise<string | undefined> {
      try {
        const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
        if (!id) {
          logger.debug(`Failed to decode API key ID from Authorization header.`);
          return undefined;
        }

        const response = await coreStart.elasticsearch.client
          .asScoped(request)
          .asCurrentUser.security.getApiKey({ with_profile_uid: true, id });

        if (response.api_keys && response.api_keys.length > 0) {
          return response.api_keys[0].profile_uid;
        }

        logger.debug(
          `No API keys were returned from query, cannot retrieve associated profile id.`
        );
      } catch (error) {
        logger.debug(
          `Failed to retrieve API key for user profile retrieval: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return undefined;
    }

    const getServices = (request: KibanaRequest): Services => ({
      savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      scopedClusterClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: getUnsecuredSavedObjectsClient(
          coreStart.savedObjects,
          request
        ),
        encryptedSavedObjectsClient,
        logger,
        configurationUtilities: actionsConfigUtils,
      }),
    });

    const getUnsecuredServices = (): UnsecuredServices => ({
      savedObjectsClient:
        coreStart.savedObjects.createInternalRepository() as ISavedObjectsRepository,
      scopedClusterClient: coreStart.elasticsearch.client.asInternalUser,
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: getUnsecuredSavedObjectsClientWithFakeRequest(
          coreStart.savedObjects
        ),
        encryptedSavedObjectsClient,
        logger,
        configurationUtilities: actionsConfigUtils,
      }),
    });

    actionExecutor.initialize({
      logger,
      eventLogger,
      spaces: startDeps.spaces?.spacesService,
      security: coreStart.security,
      getServices,
      getUnsecuredServices,
      encryptedSavedObjectsClient,
      actionTypeRegistry,
      inMemoryConnectors,
      getActionsAuthorizationWithRequest: instantiateAuthorization,
      analyticsService: coreStart.analytics,
      getCurrentUserProfileIdFromAPIKey,
    });

    taskRunnerFactory.initialize({
      logger,
      actionTypeRegistry,
      encryptedSavedObjectsClient,
      spaceIdToNamespace: (spaceId?: string) => spaceIdToNamespace(startDeps.spaces, spaceId),
      savedObjectsRepository: coreStart.savedObjects.createInternalRepository([
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]),
    });

    const registerDynamicConnector = (connector: InMemoryConnector): boolean => {
      if (!inMemoryConnectors.find((c) => c.id === connector.id)) {
        const { isInboundEventsEnabled: requestedEventsEnabled, ...withoutEventsFlag } = connector;
        inMemoryConnectors.push({
          ...withoutEventsFlag,
          isDynamic: true,
          isPreconfigured: true,
          ...(config.inboundEvents.enabled && requestedEventsEnabled === true
            ? { isInboundEventsEnabled: true }
            : {}),
        });
        logger.info(`Registered dynamic connector with id ${connector.id}`);
        return true;
      }
      return false;
    };

    const unregisterDynamicConnector = (connectorId: string): boolean => {
      const index = inMemoryConnectors.findIndex(
        (c) => c.id === connectorId && c.isDynamic === true
      );
      if (index === -1) {
        return false;
      }
      inMemoryConnectors.splice(index, 1);
      // Fire-and-forget: LeasePool.evict deletes cache keys synchronously before its first await,
      // so a same-id re-register cannot hit a stale entry. Remote terminate may still be in flight.
      void clientLeasePool.evict(connectorId);
      logger.info(`Unregistered dynamic connector with id ${connectorId}`);
      return true;
    };

    const contract: ActionsTasksStart = {
      isActionTypeEnabled: (id, options = { notifyUsage: false }) =>
        actionTypeRegistry.isActionTypeEnabled(id, options),
      isActionExecutable: (actionId, actionTypeId, options = { notifyUsage: false }) =>
        actionTypeRegistry.isActionExecutable(actionId, actionTypeId, options),
      getAllTypes: actionTypeRegistry.getAllTypes.bind(actionTypeRegistry),
      listTypes: (featureId?: string) =>
        actionTypeRegistry.list({ featureId, exposeValidation: true }),
      getActionsClientWithRequest,
      getUnsecuredActionsClient,
      inMemoryConnectors,
      renderActionParameterTemplates: (...args) =>
        renderActionParameterTemplates(logger, actionTypeRegistry, ...args),
      isSystemActionConnector: (connectorId: string): boolean =>
        inMemoryConnectors.some(
          (inMemoryConnector) =>
            inMemoryConnector.isSystemAction && inMemoryConnector.id === connectorId
        ),
    };

    return {
      contract,
      instantiateAuthorization,
      getActionsClientWithRequestInSpace,
      getCurrentUserProfileId,
      getUnsecuredSavedObjectsClient: (request) =>
        getUnsecuredSavedObjectsClient(coreStart.savedObjects, request),
      getUsableUserOAuthConnectorIds: async (request: KibanaRequest, connectorIds: string[]) => {
        throwIfCannotEncrypt();
        const profileUid = await getCurrentUserProfileId(request);
        if (!profileUid) {
          return new Set<string>();
        }
        return new UserConnectorTokenClient({
          unsecuredSavedObjectsClient: getUnsecuredSavedObjectsClient(
            coreStart.savedObjects,
            request
          ),
          encryptedSavedObjectsClient,
          logger,
          configurationUtilities: actionsConfigUtils,
        }).getUsableOAuthConnectorIds({ profileUid, connectorIds });
      },
      registerDynamicConnector,
      unregisterDynamicConnector,
      encryptedSavedObjectsClient,
    };

    function detectPreconfiguredConflicts() {
      const preconfiguredIds = new Set(
        inMemoryConnectors.filter((c) => c.isPreconfigured).map((c) => c.id)
      );

      if (preconfiguredIds.size === 0) return;

      const internalRepo = coreStart.savedObjects.createInternalRepository([
        ACTION_SAVED_OBJECT_TYPE,
      ]);

      void (async () => {
        try {
          const rawIds = Array.from(preconfiguredIds).map(
            (id) => `${ACTION_SAVED_OBJECT_TYPE}:${id}`
          );
          const result = await internalRepo.search({
            type: ACTION_SAVED_OBJECT_TYPE,
            query: { ids: { values: rawIds } },
            _source: false,
            namespaces: ['*'],
          });

          const conflictingIds = (result?.hits?.hits ?? [])
            .map((hit) => hit._id?.replace(`${ACTION_SAVED_OBJECT_TYPE}:`, ''))
            .filter((id): id is string => id !== undefined && preconfiguredIds.has(id));

          if (conflictingIds.length > 0) {
            skippedPreconfiguredConnectorIds = new Set(conflictingIds);
            const conflictSet = new Set(conflictingIds);
            inMemoryConnectors.splice(
              0,
              inMemoryConnectors.length,
              ...inMemoryConnectors.filter((c) => !(c.isPreconfigured && conflictSet.has(c.id)))
            );
            logger.error(
              i18n.translate('xpack.actions.preconfiguredConnectorConflictSkipped', {
                defaultMessage:
                  'Preconfigured {count, plural, one {connector} other {connectors}} with {count, plural, one {ID} other {IDs}} [{ids}] {count, plural, one {conflicts} other {conflict}} with existing saved {count, plural, one {connector} other {connectors}} and {count, plural, one {was} other {were}} skipped.',
                values: {
                  count: conflictingIds.length,
                  ids: conflictingIds.join(', '),
                },
              })
            );
          }
        } catch (err) {
          logger.debug(`Failed to check for preconfigured connector conflicts: ${err.message}`);
        }
      })();
    }
  };

  return {
    actionTypeRegistry,
    authTypeRegistry,
    actionExecutor,
    taskRunnerFactory,
    licenseState,
    inMemoryConnectors,
    inMemoryMetrics,
    actionsConfigUtils,
    clientLeasePool,
    relayClient,
    isESOCanEncrypt,
    includedHiddenTypes,
    getSkippedPreconfiguredConnectorIds: () => skippedPreconfiguredConnectorIds,
    getAxiosInstanceWithAuthHelper,
    setup,
    start,
    stop: () => {
      licenseState.clean();
      clientLeasePool.stop();
    },
  };
}
