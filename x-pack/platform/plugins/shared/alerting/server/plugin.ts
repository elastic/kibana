/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  Observable,
  map,
  distinctUntilChanged,
} from 'rxjs';
import { pick } from 'lodash';
import { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  IContextProvider,
  StatusServiceSetup,
  ServiceStatus,
  SavedObjectsBulkGetObject,
  ServiceStatusLevels,
  CoreStatus,
} from '@kbn/core/server';
import {
  LICENSE_TYPE,
  LicensingPluginSetup,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import {
  IEventLogger,
  IEventLogService,
  IEventLogClientService,
} from '@kbn/event-log-plugin/server';
import { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { PluginSetup as UnifiedSearchServerPluginSetup } from '@kbn/unified-search-plugin/server';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import { SharePluginStart } from '@kbn/share-plugin/server';

import { RuleTypeRegistry } from './rule_type_registry';
import { TaskRunnerFactory } from './task_runner';
import { RulesClientFactory } from './rules_client_factory';
import {
  RulesSettingsClientFactory,
  RulesSettingsService,
  getRulesSettingsFeature,
} from './rules_settings';
import { MaintenanceWindowClientFactory } from './maintenance_window_client_factory';
import { ILicenseState, LicenseState } from './lib/license_state';
import { AlertingRequestHandlerContext, ALERTING_FEATURE_ID, RuleAlertData } from './types';
import { defineRoutes } from './routes';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsHealth,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
  RulesClientApi,
} from './types';
import { registerAlertingUsageCollector } from './usage';
import { initializeAlertingTelemetry, scheduleAlertingTelemetry } from './usage/task';
import {
  setupSavedObjects,
  RULE_SAVED_OBJECT_TYPE,
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
} from './saved_objects';
import {
  initializeApiKeyInvalidator,
  scheduleApiKeyInvalidatorTask,
} from './invalidate_pending_api_keys/task';
import { scheduleAlertingHealthCheck, initializeAlertingHealth } from './health';
import { AlertingConfig, AlertingRulesConfig } from './config';
import { getHealth } from './health/get_health';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { AlertingAuthorization } from './authorization';
import { getSecurityHealth, SecurityHealth } from './lib/get_security_health';
import { registerNodeCollector, registerClusterCollector, InMemoryMetrics } from './monitoring';
import { getRuleTaskTimeout } from './lib/get_rule_task_timeout';
import { getActionsConfigMap } from './lib/get_actions_config_map';
import {
  AlertsService,
  type PublicFrameworkAlertsService,
  type InitializationPromise,
  errorResult,
} from './alerts_service';
import { maintenanceWindowFeature } from './maintenance_window_feature';
import { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';
import { ConnectorAdapter, ConnectorAdapterParams } from './connector_adapters/types';
import { DataStreamAdapter, getDataStreamAdapter } from './alerts_service/lib/data_stream_adapter';
import { createGetAlertIndicesAliasFn, GetAlertIndicesAlias } from './lib';
import { BackfillClient } from './backfill_client/backfill_client';
import { MaintenanceWindowsService } from './task_runner/maintenance_windows';

export const EVENT_LOG_PROVIDER = 'alerting';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeStart: 'execute-start',
  executeAction: 'execute-action',
  executeBackfill: 'execute-backfill',
  newInstance: 'new-instance',
  recoveredInstance: 'recovered-instance',
  activeInstance: 'active-instance',
  executeTimeout: 'execute-timeout',
  untrackedInstance: 'untracked-instance',
  gap: 'gap',
};
export const LEGACY_EVENT_LOG_ACTIONS = {
  resolvedInstance: 'resolved-instance',
};

export interface AlertingServerSetup {
  registerConnectorAdapter<
    RuleActionParams extends ConnectorAdapterParams = ConnectorAdapterParams,
    ConnectorParams extends ConnectorAdapterParams = ConnectorAdapterParams
  >(
    adapter: ConnectorAdapter<RuleActionParams, ConnectorParams>
  ): void;
  registerType<
    Params extends RuleTypeParams = RuleTypeParams,
    ExtractedParams extends RuleTypeParams = RuleTypeParams,
    State extends RuleTypeState = RuleTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = never,
    RecoveryActionGroupId extends string = never,
    AlertData extends RuleAlertData = never
  >(
    ruleType: RuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >
  ): void;

  getSecurityHealth: () => Promise<SecurityHealth>;
  getConfig: () => AlertingRulesConfig;
  frameworkAlerts: PublicFrameworkAlertsService;
  getDataStreamAdapter: () => DataStreamAdapter;
}

export interface AlertingServerStart {
  listTypes: RuleTypeRegistry['list'];
  getAllTypes: RuleTypeRegistry['getAllTypes'];
  getType: RuleTypeRegistry['get'];
  getAlertIndicesAlias: GetAlertIndicesAlias;
  getRulesClientWithRequest(request: KibanaRequest): Promise<RulesClientApi>;
  getAlertingAuthorizationWithRequest(
    request: KibanaRequest
  ): Promise<PublicMethodsOf<AlertingAuthorization>>;
  getFrameworkHealth: () => Promise<AlertsHealth>;
}

export interface AlertingPluginsSetup {
  security?: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  eventLog: IEventLogService;
  statusService: StatusServiceSetup;
  monitoringCollection: MonitoringCollectionSetup;
  data: DataPluginSetup;
  features: FeaturesPluginSetup;
  unifiedSearch: UnifiedSearchServerPluginSetup;
}

export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  taskManager: TaskManagerStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  features: FeaturesPluginStart;
  eventLog: IEventLogClientService;
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  share: SharePluginStart;
}

export class AlertingPlugin {
  private readonly config: AlertingConfig;
  private readonly logger: Logger;
  private ruleTypeRegistry?: RuleTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private licenseState: ILicenseState | null = null;
  private isESOCanEncrypt?: boolean;
  private security?: SecurityPluginSetup;
  private readonly rulesClientFactory: RulesClientFactory;
  private readonly alertingAuthorizationClientFactory: AlertingAuthorizationClientFactory;
  private readonly rulesSettingsClientFactory: RulesSettingsClientFactory;
  private readonly maintenanceWindowClientFactory: MaintenanceWindowClientFactory;
  private readonly telemetryLogger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private kibanaBaseUrl: string | undefined;
  private usageCounter: UsageCounter | undefined;
  private inMemoryMetrics: InMemoryMetrics;
  private alertsService: AlertsService | null;
  private pluginStop$: Subject<void>;
  private dataStreamAdapter?: DataStreamAdapter;
  private backfillClient?: BackfillClient;
  private readonly isServerless: boolean;
  private nodeRoles: PluginInitializerContext['node']['roles'];
  private readonly connectorAdapterRegistry = new ConnectorAdapterRegistry();

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
    this.taskRunnerFactory = new TaskRunnerFactory();
    this.rulesClientFactory = new RulesClientFactory();
    this.alertsService = null;
    this.nodeRoles = initializerContext.node.roles;
    this.alertingAuthorizationClientFactory = new AlertingAuthorizationClientFactory();
    this.rulesSettingsClientFactory = new RulesSettingsClientFactory();
    this.maintenanceWindowClientFactory = new MaintenanceWindowClientFactory();
    this.telemetryLogger = initializerContext.logger.get('usage');
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.inMemoryMetrics = new InMemoryMetrics(initializerContext.logger.get('in_memory_metrics'));
    this.pluginStop$ = new ReplaySubject(1);
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<AlertingPluginsStart, unknown>,
    plugins: AlertingPluginsSetup
  ): AlertingServerSetup {
    this.kibanaBaseUrl = core.http.basePath.publicBaseUrl;
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.security = plugins.security;

    const elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability(core.status.core$);

    const useDataStreamForAlerts = this.isServerless;
    this.dataStreamAdapter = getDataStreamAdapter({ useDataStreamForAlerts });

    core.capabilities.registerProvider(() => {
      return {
        management: {
          insightsAndAlerting: {
            triggersActions: true,
            maintenanceWindows: true,
          },
        },
      };
    });

    plugins.features.registerKibanaFeature(getRulesSettingsFeature(this.isServerless));

    plugins.features.registerKibanaFeature(maintenanceWindowFeature);

    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    const taskManagerStartPromise = core
      .getStartServices()
      .then(([_, alertingStart]) => alertingStart.taskManager);

    this.backfillClient = new BackfillClient({
      logger: this.logger,
      taskManagerSetup: plugins.taskManager,
      taskManagerStartPromise,
      taskRunnerFactory: this.taskRunnerFactory,
    });

    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));

    if (this.config.enableFrameworkAlerts) {
      if (this.nodeRoles.migrator) {
        this.logger.info(`Skipping initialization of AlertsService on migrator node`);
      } else {
        this.logger.info(
          `using ${
            this.dataStreamAdapter.isUsingDataStreams() ? 'datastreams' : 'indexes and aliases'
          } for persisting alerts`
        );
        this.alertsService = new AlertsService({
          logger: this.logger,
          pluginStop$: this.pluginStop$,
          kibanaVersion: this.kibanaVersion,
          dataStreamAdapter: this.dataStreamAdapter!,
          elasticsearchClientPromise: core
            .getStartServices()
            .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
          elasticsearchAndSOAvailability$,
          isServerless: this.isServerless,
        });
      }
    }

    const ruleTypeRegistry = new RuleTypeRegistry({
      config: this.config,
      logger: this.logger,
      taskManager: plugins.taskManager,
      taskRunnerFactory: this.taskRunnerFactory,
      licenseState: this.licenseState,
      licensing: plugins.licensing,
      alertsService: this.alertsService,
      minimumScheduleInterval: this.config.rules.minimumScheduleInterval,
      inMemoryMetrics: this.inMemoryMetrics,
    });
    this.ruleTypeRegistry = ruleTypeRegistry;

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerAlertingUsageCollector(usageCollection, taskManagerStartPromise);
      const eventLogIndex = this.eventLogService.getIndexPattern();
      initializeAlertingTelemetry(this.telemetryLogger, core, plugins.taskManager, eventLogIndex);
    }

    // Usage counter for telemetry
    this.usageCounter = plugins.usageCollection?.createUsageCounter(ALERTING_FEATURE_ID);

    const getSearchSourceMigrations = plugins.data.search.searchSource.getAllMigrations.bind(
      plugins.data.search.searchSource
    );
    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.ruleTypeRegistry,
      this.logger,
      plugins.actions.isPreconfiguredConnector,
      getSearchSourceMigrations
    );

    initializeApiKeyInvalidator(
      this.logger,
      core.getStartServices(),
      plugins.taskManager,
      this.config
    );

    const serviceStatus$ = new BehaviorSubject<ServiceStatus>({
      level: ServiceStatusLevels.available,
      summary: 'Alerting is (probably) ready',
    });
    core.status.set(serviceStatus$);

    initializeAlertingHealth(this.logger, plugins.taskManager, core.getStartServices());

    core.http.registerRouteHandlerContext<AlertingRequestHandlerContext, 'alerting'>(
      'alerting',
      this.createRouteHandlerContext(core)
    );

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

    // Routes
    const router = core.http.createRouter<AlertingRequestHandlerContext>();
    // Register routes
    defineRoutes({
      router,
      licenseState: this.licenseState,
      usageCounter: this.usageCounter,
      getAlertIndicesAlias: createGetAlertIndicesAliasFn(this.ruleTypeRegistry!),
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      config$: plugins.unifiedSearch.autocomplete.getInitializerContextConfig().create(),
      isServerless: this.isServerless,
      docLinks: core.docLinks,
    });

    return {
      registerConnectorAdapter: <
        RuleActionParams extends ConnectorAdapterParams = ConnectorAdapterParams,
        ConnectorParams extends ConnectorAdapterParams = ConnectorAdapterParams
      >(
        adapter: ConnectorAdapter<RuleActionParams, ConnectorParams>
      ) => {
        this.connectorAdapterRegistry.register(adapter);
      },
      registerType: <
        Params extends RuleTypeParams = never,
        ExtractedParams extends RuleTypeParams = never,
        State extends RuleTypeState = never,
        InstanceState extends AlertInstanceState = never,
        InstanceContext extends AlertInstanceContext = never,
        ActionGroupIds extends string = never,
        RecoveryActionGroupId extends string = never,
        AlertData extends RuleAlertData = never
      >(
        ruleType: RuleType<
          Params,
          ExtractedParams,
          State,
          InstanceState,
          InstanceContext,
          ActionGroupIds,
          RecoveryActionGroupId,
          AlertData
        >
      ) => {
        if (!(ruleType.minimumLicenseRequired in LICENSE_TYPE)) {
          throw new Error(`"${ruleType.minimumLicenseRequired}" is not a valid license type`);
        }
        ruleType.ruleTaskTimeout = getRuleTaskTimeout({
          config: this.config.rules,
          ruleTaskTimeout: ruleType.ruleTaskTimeout,
          ruleTypeId: ruleType.id,
        });
        ruleType.cancelAlertsOnRuleTimeout =
          ruleType.cancelAlertsOnRuleTimeout ?? this.config.cancelAlertsOnRuleTimeout;
        ruleType.doesSetRecoveryContext = ruleType.doesSetRecoveryContext ?? false;
        ruleType.autoRecoverAlerts = ruleType.autoRecoverAlerts ?? true;
        ruleTypeRegistry.register(ruleType);
      },
      getSecurityHealth: async () => {
        return await getSecurityHealth(
          async () => (this.licenseState ? this.licenseState.getIsSecurityEnabled() : null),
          async () => plugins.encryptedSavedObjects.canEncrypt,
          async () => {
            const [, { security }] = await core.getStartServices();
            return security?.authc.apiKeys.areAPIKeysEnabled() ?? false;
          }
        );
      },
      getConfig: () => {
        return {
          ...pick(this.config.rules, ['minimumScheduleInterval', 'maxScheduledPerMinute', 'run']),
          isUsingSecurity: this.licenseState ? !!this.licenseState.getIsSecurityEnabled() : false,
        };
      },
      frameworkAlerts: {
        enabled: () => this.config.enableFrameworkAlerts,
        getContextInitializationPromise: (
          context: string,
          namespace: string
        ): Promise<InitializationPromise> => {
          if (this.alertsService) {
            return this.alertsService.getContextInitializationPromise(context, namespace);
          }

          return Promise.resolve(errorResult(`Framework alerts service not available`));
        },
      },
      getDataStreamAdapter: () => this.dataStreamAdapter!,
    };
  }

  public start(core: CoreStart, plugins: AlertingPluginsStart): AlertingServerStart {
    const {
      isESOCanEncrypt,
      logger,
      taskRunnerFactory,
      ruleTypeRegistry,
      rulesClientFactory,
      alertingAuthorizationClientFactory,
      rulesSettingsClientFactory,
      maintenanceWindowClientFactory,
      security,
      licenseState,
    } = this;
    licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, AD_HOC_RUN_SAVED_OBJECT_TYPE],
    });

    const spaceIdToNamespace = (spaceId?: string) => {
      return plugins.spaces && spaceId
        ? plugins.spaces.spacesService.spaceIdToNamespace(spaceId)
        : undefined;
    };

    alertingAuthorizationClientFactory.initialize({
      ruleTypeRegistry: ruleTypeRegistry!,
      securityPluginStart: plugins.security,
      async getSpace(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
      },
      features: plugins.features,
    });

    rulesClientFactory.initialize({
      ruleTypeRegistry: ruleTypeRegistry!,
      logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: security,
      securityPluginStart: plugins.security,
      internalSavedObjectsRepository: core.savedObjects.createInternalRepository([
        RULE_SAVED_OBJECT_TYPE,
        AD_HOC_RUN_SAVED_OBJECT_TYPE,
      ]),
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
      },
      actions: plugins.actions,
      eventLog: plugins.eventLog,
      kibanaVersion: this.kibanaVersion,
      authorization: alertingAuthorizationClientFactory,
      eventLogger: this.eventLogger,
      minimumScheduleInterval: this.config.rules.minimumScheduleInterval,
      maxScheduledPerMinute: this.config.rules.maxScheduledPerMinute,
      getAlertIndicesAlias: createGetAlertIndicesAliasFn(this.ruleTypeRegistry!),
      alertsService: this.alertsService,
      backfillClient: this.backfillClient!,
      connectorAdapterRegistry: this.connectorAdapterRegistry,
      uiSettings: core.uiSettings,
      securityService: core.security,
    });

    rulesSettingsClientFactory.initialize({
      logger: this.logger,
      savedObjectsService: core.savedObjects,
      securityService: core.security,
      isServerless: this.isServerless,
    });

    maintenanceWindowClientFactory.initialize({
      logger: this.logger,
      savedObjectsService: core.savedObjects,
      securityService: core.security,
      uiSettings: core.uiSettings,
    });

    const getRulesClientWithRequest = async (request: KibanaRequest) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create alerts client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }
      return rulesClientFactory!.create(request, core.savedObjects);
    };

    const getAlertingAuthorizationWithRequest = async (request: KibanaRequest) => {
      return alertingAuthorizationClientFactory!.create(request);
    };

    const getRulesSettingsClientWithRequest = (request: KibanaRequest) => {
      return rulesSettingsClientFactory!.create(request);
    };

    const getMaintenanceWindowClientWithRequest = (request: KibanaRequest) => {
      return maintenanceWindowClientFactory!.create(request);
    };

    taskRunnerFactory.initialize({
      actionsConfigMap: getActionsConfigMap(this.config.rules.run.actions),
      actionsPlugin: plugins.actions,
      alertsService: this.alertsService,
      backfillClient: this.backfillClient!,
      basePathService: core.http.basePath,
      cancelAlertsOnRuleTimeout: this.config.cancelAlertsOnRuleTimeout,
      connectorAdapterRegistry: this.connectorAdapterRegistry,
      data: plugins.data,
      dataViews: plugins.dataViews,
      elasticsearch: core.elasticsearch,
      encryptedSavedObjectsClient,
      eventLogger: this.eventLogger!,
      executionContext: core.executionContext,
      kibanaBaseUrl: this.kibanaBaseUrl,
      logger,
      maintenanceWindowsService: new MaintenanceWindowsService({
        cacheInterval: this.config.rulesSettings.cacheInterval,
        getMaintenanceWindowClientWithRequest,
        logger,
      }),
      maxAlerts: this.config.rules.run.alerts.max,
      ruleTypeRegistry: this.ruleTypeRegistry!,
      rulesSettingsService: new RulesSettingsService({
        cacheInterval: this.config.rulesSettings.cacheInterval,
        getRulesSettingsClientWithRequest,
        isServerless: this.isServerless,
        logger,
      }),
      savedObjects: core.savedObjects,
      share: plugins.share,
      spaceIdToNamespace,
      uiSettings: core.uiSettings,
      usageCounter: this.usageCounter,
      getEventLogClient: (request: KibanaRequest) => plugins.eventLog.getClient(request),
      isServerless: this.isServerless,
    });

    this.eventLogService!.registerSavedObjectProvider(RULE_SAVED_OBJECT_TYPE, (request) => {
      return async (objects?: SavedObjectsBulkGetObject[]) => {
        const client = await getRulesClientWithRequest(request);

        return objects
          ? Promise.all(objects.map(async (objectItem) => await client.get({ id: objectItem.id })))
          : Promise.resolve([]);
      };
    });

    this.eventLogService!.isEsContextReady()
      .then(() => {
        scheduleAlertingTelemetry(this.telemetryLogger, plugins.taskManager);
      })
      .catch(() => {}); // it shouldn't reject, but just in case

    scheduleAlertingHealthCheck(this.logger, this.config, plugins.taskManager).catch(() => {}); // it shouldn't reject, but just in case
    scheduleApiKeyInvalidatorTask(this.telemetryLogger, this.config, plugins.taskManager).catch(
      () => {}
    ); // it shouldn't reject, but just in case

    return {
      listTypes: ruleTypeRegistry!.list.bind(this.ruleTypeRegistry!),
      getType: ruleTypeRegistry!.get.bind(this.ruleTypeRegistry),
      getAllTypes: ruleTypeRegistry!.getAllTypes.bind(this.ruleTypeRegistry!),
      getAlertIndicesAlias: createGetAlertIndicesAliasFn(this.ruleTypeRegistry!),
      getAlertingAuthorizationWithRequest,
      getRulesClientWithRequest,
      getFrameworkHealth: async () =>
        await getHealth(core.savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE])),
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup<AlertingPluginsStart, unknown>
  ): IContextProvider<AlertingRequestHandlerContext, 'alerting'> => {
    const {
      ruleTypeRegistry,
      rulesClientFactory,
      rulesSettingsClientFactory,
      maintenanceWindowClientFactory,
    } = this;
    return async function alertsRouteHandlerContext(context, request) {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getRulesClient: () => {
          return rulesClientFactory!.create(request, savedObjects);
        },
        getRulesSettingsClient: (withoutAuth?: boolean) => {
          if (withoutAuth) {
            return rulesSettingsClientFactory.create(request);
          }
          return rulesSettingsClientFactory.createWithAuthorization(request);
        },
        getMaintenanceWindowClient: () => {
          return maintenanceWindowClientFactory.createWithAuthorization(request);
        },
        listTypes: ruleTypeRegistry!.list.bind(ruleTypeRegistry!),
        getFrameworkHealth: async () =>
          await getHealth(savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE])),
        areApiKeysEnabled: async () => {
          const [, { security }] = await core.getStartServices();
          return security?.authc.apiKeys.areAPIKeysEnabled() ?? false;
        },
      };
    };
  };

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}

export function getElasticsearchAndSOAvailability(
  core$: Observable<CoreStatus>
): Observable<boolean> {
  return core$.pipe(
    map(
      ({ elasticsearch, savedObjects }) =>
        elasticsearch.level === ServiceStatusLevels.available &&
        savedObjects.level === ServiceStatusLevels.available
    ),
    distinctUntilChanged()
  );
}
