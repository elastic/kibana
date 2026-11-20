/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrometheusExporter } from '@kbn/metrics';
import { getTelemetryConfiguration } from '@kbn/apm-config-loader';
import type { Observable } from 'rxjs';
import { combineLatest, firstValueFrom, Subject, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
  UsageCounter,
} from '@kbn/usage-collection-plugin/server';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  CoreStart,
} from '@kbn/core/server';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InvalidateAPIKeysParams } from '@kbn/security-plugin-types-server';
import { join } from 'path';
import { existsSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { IElasticsearchConfig } from '@kbn/core-elasticsearch-server';
import { collectRemoteGaugeMetrics } from './task_process/metrics_transport';
import { TASK_PROCESS_PROTOCOL_VERSION } from './task_process/protocol';
import type { TaskProcessDispatch } from './task_process/remote_task_runner';
import { serializeElasticsearchConfig } from './task_process/es_config';
import { TaskProcessSupervisor } from './task_process/supervisor';
import type { TaskBundlePackManifest, TaskProcessSupervisorStats } from './task_process/supervisor';
import type { TaskHost, TaskTypeModule, TaskTypeRegistrationOptions } from './task_type_module';
import { assertHostExtensions, toTaskDefinition } from './task_type_module';
import { resolveSettingsByPlugin, serializeSettings } from './task_process/settings';
import { TaskProcessDispatchFailureCounter } from './task_process/dispatch_failure_counter';
import type { TaskProcessInit } from './task_process/wire';
import { taskType as deleteInactiveNodesTaskType } from './task_types/delete_inactive_nodes.task';
import { taskType as markRemovedTasksTaskType } from './task_types/mark_removed_tasks_as_unrecognized.task';
import { scheduleDeleteInactiveNodesTaskDefinition } from './kibana_discovery_service/delete_inactive_nodes_task';
import { KibanaDiscoveryService } from './kibana_discovery_service';
import { TaskExecutionControlService } from './execution_control';
import { TaskPollingLifecycle } from './polling_lifecycle';
import type { TaskManagerConfig } from './config';
import { DEFAULT_TASK_EXECUTION_MODE } from './config';
import type { Middleware } from './lib/middleware';
import { createInitialMiddleware, addMiddlewareToChain } from './lib/middleware';
import { removeIfExists } from './lib/remove_if_exists';
import {
  setupSavedObjects,
  BACKGROUND_TASK_NODE_SO_NAME,
  TASK_SO_NAME,
  INVALIDATE_API_KEY_SO_NAME,
  TASK_EXECUTION_CONTROL_SO_NAME,
} from './saved_objects';
import type { TaskDefinitionRegistry } from './task_type_dictionary';
import { TaskTypeDictionary } from './task_type_dictionary';
import {
  createTaskSchedulingSnapshot,
  type TaskManagerTaskProcessSettings,
} from './task_scheduling_snapshot';
import type { AggregationOpts, FetchResult, SearchOpts } from './task_store';
import { TaskStore } from './task_store';
import { TaskScheduling } from './task_scheduling';
import {
  backgroundTaskUtilizationRoute,
  healthRoute,
  metricsRoute,
  executionControlRoutes,
} from './routes';
import type { MonitoringStats } from './monitoring';
import { createMonitoringStats } from './monitoring';
import type { ConcreteTaskInstance, TaskEventLogger } from './task';
import {
  registerEventLogTelemetryTask,
  registerTaskManagerUsageCollector,
  scheduleEventLogTelemetryTask,
} from './usage';
import { TASK_MANAGER_CLAIM_NUDGE_INDEX, TASK_MANAGER_INDEX } from './constants';
import { TaskManagerClaimNudgeService } from './claim_nudge/claim_nudge_service';
import { AdHocTaskCounter } from './lib/adhoc_task_counter';
import { setupIntervalLogging } from './lib/log_health_metrics';
import type { Metrics } from './metrics';
import { metricsStream } from './metrics';
import { TaskManagerMetricsCollector } from './metrics/task_metrics_collector';
import { TaskPartitioner } from './lib/task_partitioner';
import { getDefaultCapacity } from './lib/get_default_capacity';
import { calculateStartingCapacity } from './lib/create_managed_configuration';
import { scheduleMarkRemovedTasksAsUnrecognizedDefinition } from './removed_tasks/mark_removed_tasks_as_unrecognized';
import { getElasticsearchAndSOAvailability } from './lib/get_es_and_so_availability';
import { LicenseSubscriber } from './license_subscriber';
import type {
  ApiKeyInvalidationFn,
  UiamApiKeyInvalidationFn,
} from './invalidate_api_keys/invalidate_api_keys_task';
import {
  registerInvalidateApiKeyTask,
  scheduleInvalidateApiKeyTask,
} from './invalidate_api_keys/invalidate_api_keys_task';
import { createApiKeyStrategy } from './api_key_strategy';

export interface TaskManagerSetupContract {
  /**
   * @deprecated
   */
  index: string;
  addMiddleware: (middleware: Middleware, options?: { id: string }) => void;
  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  registerTaskDefinitions: (taskDefinitions: TaskDefinitionRegistry) => void;
  /**
   * Registers a task type module: one file that holds the definition and the runner, and that can
   * also be bundled to run in a process of its own. The runner gets the host, which is Core here.
   * @param module - What `defineTaskType` returned
   * @param options.logger - The logger the runner gets; defaults to Task Manager's
   * @param options.hostExtensions - The real services for the capabilities the module declares
   * @param options.settings - Getters of the plugin configs the module lists in `settings`
   */
  registerTaskType: (module: TaskTypeModule, options?: TaskTypeRegistrationOptions) => void;
  registerCanEncryptedSavedObjects: (canEncrypt: boolean) => void;
  /** Supplies the owning encrypted saved objects service's current task encryption keys. */
  registerTaskProcessEncryptionKeys: (
    getKeys: () => NonNullable<TaskProcessInit['encryptedSavedObjects']>
  ) => void;
  registerTaskEventLogger: (logger: TaskEventLogger) => void;
}

export interface TaskProcessStats {
  mode: 'in_process' | 'child_process' | 'remote';
  dispatchFailures: ReturnType<TaskProcessDispatchFailureCounter['getCounts']>;
  /** Only in `child_process` mode. */
  processes?: TaskProcessSupervisorStats;
}

export type TaskManagerStartContract = Pick<
  TaskScheduling,
  | 'schedule'
  | 'runSoon'
  | 'ensureScheduled'
  | 'bulkUpdateSchedules'
  | 'bulkEnable'
  | 'bulkDisable'
  | 'bulkSchedule'
  | 'bulkUpdateState'
> &
  Pick<TaskStore, 'fetch' | 'aggregate' | 'get' | 'bulkGet' | 'remove' | 'bulkRemove'> & {
    removeIfExists: TaskStore['remove'];
  } & {
    getRegisteredTypes: () => string[];
    /**
     * Process dispatch failures since Kibana started, by task type and reason, and the
     * processes started now. The failures are counted in the `taskManager` usage counter as `taskProcessDispatchFailure:<reason>:<type>`.
     */
    getTaskProcessStats: () => TaskProcessStats;
    /**
     * The packs a task type's bundle declares (from `manifest.json`), for the plugin that registered
     * it to resolve what a specific run needs itself (`TaskTypeRegistrationOptions.getPacks`).
     * Undefined before process execution starts, or for a task type with no bundle.
     */
    getTaskBundlePacks: (taskType: string) => TaskBundlePackManifest[] | undefined;
    registerEncryptedSavedObjectsClient: (
      client: EncryptedSavedObjectsClient,
      isEncryptionError?: (error: Error) => boolean
    ) => void;
    registerApiKeyInvalidateFn: (fn?: ApiKeyInvalidationFn) => void;
    registerUiamApiKeyInvalidateFn: (fn?: UiamApiKeyInvalidationFn) => void;
  };

export interface TaskManagerPluginsStart {
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  usageCollection?: UsageCollectionStart;
}

export interface TaskManagerPluginsSetup {
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

const LogHealthForBackgroundTasksOnlyMinutes = 60;

export class TaskManagerPlugin
  implements
    Plugin<
      TaskManagerSetupContract,
      TaskManagerStartContract,
      TaskManagerPluginsSetup,
      TaskManagerPluginsStart
    >
{
  private taskPollingLifecycle?: TaskPollingLifecycle;
  private taskManagerId?: string;
  private usageCounter?: UsageCounter;
  private config: TaskManagerConfig;
  private logger: Logger;
  private definitions: TaskTypeDictionary;
  private middleware: Middleware = createInitialMiddleware();
  private elasticsearchAndSOAvailability$?: Observable<boolean>;
  private monitoringStats$ = new Subject<MonitoringStats>();
  private metrics$ = new Subject<Metrics>();
  private resetMetrics$ = new Subject<boolean>();
  private shouldRunBackgroundTasks: boolean;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private adHocTaskCounter: AdHocTaskCounter;
  private readonly schedulingMiddlewareIds: string[] = [];
  private anonymousSchedulingMiddlewareCount = 0;
  private taskManagerMetricsCollector?: TaskManagerMetricsCollector;
  private nodeRoles: PluginInitializerContext['node']['roles'];
  private kibanaDiscoveryService?: KibanaDiscoveryService;
  private executionControlService?: TaskExecutionControlService;
  private heapSizeLimit: number = 0;
  private taskProcessDispatch?: TaskProcessDispatch;
  private featureFlagsService?: CoreStart['featureFlags'];
  private taskProcessSupervisor?: TaskProcessSupervisor;
  private unregisterGaugeSource?: () => void;
  /** The task types registered as modules: the ones that can run outside this process. */
  private readonly moduleTaskTypes = new Set<string>();
  private readonly moduleRegistrations = new Map<
    string,
    { module: TaskTypeModule; options?: TaskTypeRegistrationOptions }
  >();
  private getTaskProcessInit?: (
    taskType: string
  ) => Promise<
    Omit<TaskProcessInit, 'kind' | 'authToken' | 'elasticsearch' | 'kibanaVersion'> | undefined
  >;
  /** Process dispatch failures since this Kibana instance started. */
  private readonly taskProcessDispatchFailures: TaskProcessDispatchFailureCounter;
  private publicBaseUrl?: string;
  private serverBasePath?: string;
  private usageCollectionSetup?: UsageCollectionSetup;
  private elasticsearchConfig?: IElasticsearchConfig;
  private numOfKibanaInstances$: Subject<number> = new BehaviorSubject(1);
  private canEncryptSavedObjects: boolean;
  private getTaskProcessEncryptionKeys?: () => NonNullable<
    TaskProcessInit['encryptedSavedObjects']
  >;
  private licenseSubscriber?: PublicMethodsOf<LicenseSubscriber>;
  private invalidateApiKeyFn?: ApiKeyInvalidationFn;
  private taskEventLogger?: TaskEventLogger;
  private invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn;
  private taskStore?: TaskStore;
  private startContract?: TaskManagerStartContract;
  private enrichFakeRequest?: FakeRequestEnricher;
  private claimNudgeService?: TaskManagerClaimNudgeService;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
    this.taskProcessDispatchFailures = new TaskProcessDispatchFailureCounter(this.logger);
    this.config = initContext.config.get<TaskManagerConfig>();
    this.definitions = new TaskTypeDictionary(this.logger);
    this.kibanaVersion = initContext.env.packageInfo.version;
    this.nodeRoles = initContext.node.roles;
    this.shouldRunBackgroundTasks = this.nodeRoles.backgroundTasks;
    this.adHocTaskCounter = new AdHocTaskCounter();
    this.canEncryptSavedObjects = false;
  }

  isNodeBackgroundTasksOnly() {
    const { backgroundTasks, migrator, ui } = this.nodeRoles;
    return backgroundTasks && !migrator && !ui;
  }

  private invalidateApiKey(params: InvalidateAPIKeysParams) {
    if (this.invalidateApiKeyFn) {
      return this.invalidateApiKeyFn(params);
    }
  }

  private get invalidateUiamApiKey(): UiamApiKeyInvalidationFn | undefined {
    return this.invalidateUiamApiKeyFn;
  }

  public setup(
    core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>,
    plugins: TaskManagerPluginsSetup
  ): TaskManagerSetupContract {
    const isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';
    this.usageCollectionSetup = plugins.usageCollection;
    const clusterClientPromise = core
      .getStartServices()
      .then(([coreServices]) => coreServices.elasticsearch.client);
    this.elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability({
      core$: core.status.core$,
      isServerless,
      logger: this.logger,
      getClusterClient: () => clusterClientPromise,
    });

    core.metrics
      .getOpsMetrics$()
      .pipe(distinctUntilChanged())
      .subscribe((metrics) => {
        this.heapSizeLimit = metrics.process.memory.heap.size_limit;
      });

    setupSavedObjects(core.savedObjects);

    // Child processes connect to Elasticsearch the way Kibana does.
    core.elasticsearch.legacy.config$.subscribe((config) => {
      this.elasticsearchConfig = config;
    });
    this.publicBaseUrl = core.http.basePath.publicBaseUrl;
    this.serverBasePath = core.http.basePath.serverBasePath;
    const getServerInfo = (publicBaseUrl?: string): TaskHost['server'] => ({
      uuid: this.initContext.env.instanceUuid,
      version: this.kibanaVersion,
      buildNum: this.initContext.env.packageInfo.buildNum,
      publicBaseUrl,
      isServerless,
    });
    const registerTaskType: TaskManagerSetupContract['registerTaskType'] = (module, options) => {
      assertHostExtensions(module, options);
      this.moduleTaskTypes.add(module.type);
      this.moduleRegistrations.set(module.type, { module, options });
      this.definitions.registerTaskDefinitions({
        [module.type]: toTaskDefinition(module, async () => {
          const [coreStart, pluginsStart] = await core.getStartServices();
          const extensions = options?.hostExtensions;
          const host: TaskHost = {
            analytics: coreStart.analytics,
            http: coreStart.http,
            ...(module.featureFlags ? { featureFlags: coreStart.featureFlags } : {}),
            logger: options?.logger ?? this.logger,
            elasticsearch: coreStart.elasticsearch.client,
            savedObjects: coreStart.savedObjects,
            executionContext: coreStart.executionContext,
            security: { ...coreStart.security, fips: core.security.fips },
            server: getServerInfo(coreStart.http.basePath.publicBaseUrl),
          };
          if (module.encryptedSavedObjectTypes?.length || module.createSavedObjectTypes) {
            host.encryptedSavedObjects = await extensions!.encryptedSavedObjects!();
          }
          if (module.eventLog) host.eventLog = extensions!.eventLog;
          if (extensions?.plugins) host.plugins = await extensions.plugins();
          if (module.taskManager) host.taskManager = this.startContract;
          if (module.usageCounters && this.usageCollectionSetup) {
            const usageCollection = this.usageCollectionSetup;
            host.usageCounters = {
              getUsageCounter: (domainId, params) =>
                usageCollection.getUsageCounterByDomainId(domainId) ??
                usageCollection.createUsageCounter(domainId, params),
            };
          }
          if (module.uiSettings || module.registerUiSettings)
            host.uiSettings = coreStart.uiSettings;
          if (module.dataStreams) host.dataStreams = coreStart.dataStreams;
          if (module.licensing) {
            host.licensing = {
              license$: pluginsStart.licensing.license$,
              featureUsage: pluginsStart.licensing.featureUsage,
            };
          }
          if (module.settings?.length) {
            const registeredSettings = options?.settings;
            if (!registeredSettings) {
              throw new Error('The task module settings were not registered');
            }
            host.settings = await resolveSettingsByPlugin(
              Object.fromEntries(module.settings.map((id) => [id, registeredSettings[id]]))
            );
          }
          return host;
        }),
      });
    };
    // What a task type's process may be told is up to the plugin that registered the task type: the
    // module a process runs is a separate instance, which uses what it declared of it.
    // Core's ui settings overrides come from `kibana.yml` and never change while Kibana runs. Core
    // does not hand them out, but its ui settings client reports the settings that are overridden.
    let uiSettingsOverrides:
      | Promise<{ overrides: Record<string, unknown>; globalOverrides: Record<string, unknown> }>
      | undefined;
    const readUiSettingsOverrides = () =>
      (uiSettingsOverrides ??= (async () => {
        const [coreStart] = await core.getStartServices();
        const client = coreStart.savedObjects.getUnsafeInternalClient();
        const overridden = async (
          scoped: ReturnType<typeof coreStart.uiSettings.asScopedToClient>
        ) =>
          Object.fromEntries(
            Object.entries(await scoped.getUserProvided())
              .filter(([, value]) => value.isOverridden)
              .map(([key, value]) => [key, value.userValue ?? null])
          );
        return {
          overrides: await overridden(coreStart.uiSettings.asScopedToClient(client)),
          globalOverrides: await overridden(coreStart.uiSettings.globalAsScopedToClient(client)),
        };
      })().catch((error) => {
        // Try again at the next dispatch rather than keep a failure.
        uiSettingsOverrides = undefined;
        throw error;
      }));
    this.getTaskProcessInit = async (taskType) => {
      const registration = this.moduleRegistrations.get(taskType);
      if (!registration) return undefined;
      const { options, module } = registration;
      const taskStore = this.taskStore;
      if (!taskStore)
        throw new Error(
          'Native task scheduling metadata is not available before Task Manager starts'
        );
      const [coreStart] = await core.getStartServices();
      const selfHttp = coreStart.http.selfClient.getDispatchConfig();
      const init: Pick<
        TaskProcessInit,
        | 'server'
        | 'instrumentation'
        | 'executionContext'
        | 'encryptedSavedObjects'
        | 'settings'
        | 'parity'
        | 'uiSettingsOverrides'
        | 'uiSettingsGlobalOverrides'
      > = {
        executionContext: core.executionContext.getConfig(),
        server: {
          ...getServerInfo(this.publicBaseUrl),
          kibanaUrl: selfHttp.url,
          selfHttp,
          ...(this.serverBasePath ? { basePath: this.serverBasePath } : {}),
          isDev: this.initContext.env.mode.dev,
        } as TaskProcessInit['server'],
      };
      const instrumentation = getTelemetryConfiguration('kibana');
      if (instrumentation) {
        init.instrumentation = {
          files: instrumentation.files,
          environment: instrumentation.environment,
          apm: serializeSettings(instrumentation.apm),
          redactUsers: instrumentation.redactUsers,
          telemetry: serializeSettings(instrumentation.telemetry),
          monitoringCollection: serializeSettings(instrumentation.monitoringCollection),
        };
      }
      // Every process gets them: the module Kibana registered may not declare the ui settings the
      // module of the process does, and an override is Kibana's whether or not it is registered.
      const { overrides, globalOverrides } = await readUiSettingsOverrides();
      init.uiSettingsOverrides = overrides;
      init.uiSettingsGlobalOverrides = globalOverrides;
      if (options?.parity) {
        init.parity = Object.entries(options.parity).map(([kind, getIds]) => ({
          kind,
          ids: getIds(),
        }));
      }
      if (module.taskManager) {
        if (this.anonymousSchedulingMiddlewareCount > 0)
          throw new Error(
            'Task scheduling middleware must declare native contribution ids before process execution'
          );
        if (!this.getTaskProcessEncryptionKeys)
          throw new Error('Native Task Manager encryption settings have not been registered');
        init.encryptedSavedObjects = this.getTaskProcessEncryptionKeys();
      } else if (options?.hostExtensions?.getEncryptionKeys) {
        init.encryptedSavedObjects = options.hostExtensions.getEncryptionKeys();
      }
      init.settings = {
        ...(options?.settings
          ? Object.fromEntries(
              Object.entries(await resolveSettingsByPlugin(options.settings)).map(([id, value]) => [
                id,
                serializeSettings(value),
              ])
            )
          : {}),
        // What a process needs to schedule tasks with credentials as this Kibana does.
        taskManager: serializeSettings({
          api_key_type: this.config.api_key_type,
          grant_uiam_api_keys: this.config.grant_uiam_api_keys,
          scheduling: {
            taskManagerId: taskStore.taskManagerId,
            securityEnabled: this.licenseSubscriber?.getIsSecurityEnabled() === true,
            middlewareIds: [...this.schedulingMiddlewareIds],
            allowReadingInvalidState: this.config.allow_reading_invalid_state,
            definitions: createTaskSchedulingSnapshot(this.definitions),
            claimNudge: this.claimNudgeService
              ? { index: TASK_MANAGER_CLAIM_NUDGE_INDEX }
              : undefined,
          },
        } satisfies TaskManagerTaskProcessSettings),
      } as TaskProcessInit['settings'];
      return init;
    };

    const { mode = DEFAULT_TASK_EXECUTION_MODE, remote } = this.config.task_execution ?? {};
    if (mode !== 'in_process') {
      const telemetry = getTelemetryConfiguration('kibana');
      if (
        telemetry?.telemetry.enabled &&
        telemetry.monitoringCollection.enabled &&
        telemetry.monitoringCollection.opentelemetry.metrics.prometheus.enabled
      ) {
        this.unregisterGaugeSource = PrometheusExporter.get().registerGaugeSource(async () => {
          const owner = this.initContext.env.instanceUuid;
          if (mode === 'remote') {
            if (!remote) throw new Error('The remote worker gauge source is not configured');
            return collectRemoteGaugeMetrics({ url: remote.url, token: remote.token }, owner);
          }
          if (!this.taskProcessSupervisor)
            throw new Error('The task worker gauge source has not started');
          return this.taskProcessSupervisor.collectGaugeMetrics(owner);
        });
      }

      this.taskProcessDispatch = {
        onTasksCreated: (count) => this.adHocTaskCounter.increment(count),
        onMetrics: (metrics) => PrometheusExporter.get().addMetrics(metrics),
        getCurrentTasksInPool: () => {
          if (!this.taskPollingLifecycle)
            throw new Error('Task Manager execution pool has not started');
          return this.taskPollingLifecycle.getCurrentTasksInPool();
        },
        kibanaVersion: this.kibanaVersion,
        onDispatchFailure: (taskType, reason, detail) => {
          this.taskProcessDispatchFailures.increment(taskType, reason, detail);
          this.usageCounter?.incrementCounter({
            counterName: `taskProcessDispatchFailure:${reason}:${taskType}`,
            counterType: 'count',
          });
        },
        // The feature flags a task type declares, as Kibana's flag service answers them now.
        getFeatureFlags: async (taskType, contributions) => {
          const registration = this.moduleRegistrations.get(taskType);
          const declared = registration?.module.featureFlags;
          const added = registration?.options?.featureFlags?.();
          const flags =
            declared || added || contributions
              ? { ...declared, ...added, ...contributions }
              : undefined;
          if (!flags) return undefined;
          if (!this.featureFlagsService) {
            if (!Object.keys(flags).length) return {};
            throw new Error('Task Manager feature flag evaluation has not initialized');
          }
          const service = this.featureFlagsService;
          const values = await Promise.all(
            Object.entries(flags).map(async ([name, fallback]) => {
              const value$ =
                typeof fallback === 'boolean'
                  ? service.getBooleanValue$(name, fallback)
                  : typeof fallback === 'number'
                  ? service.getNumberValue$(name, fallback)
                  : service.getStringValue$(name, fallback);
              // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- evaluated for every run that is dispatched, so each run reads the current flag value
              return [name, await firstValueFrom(value$ as Observable<boolean | string | number>)];
            })
          );
          return Object.fromEntries(values);
        },
        getSnapshot: async (taskType, taskInstance) => {
          const registration = this.moduleRegistrations.get(taskType);
          const packs = await registration?.options?.getPacks?.(taskInstance);
          return {
            protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
            init: {
              ...(await this.getTaskProcessInit?.(taskType)),
              // `[]` (load nothing) and `undefined` (unresolved, load every pack) are different.
              ...(packs !== undefined ? { packs } : {}),
              elasticsearch: serializeElasticsearchConfig(this.elasticsearchConfig!),
              kibanaVersion: this.kibanaVersion,
            },
          };
        },
        getCancelGracePeriodMs: (taskType) =>
          this.moduleRegistrations.get(taskType)?.module.cancelGracePeriodMs,
        getRoute: (taskType) => {
          if (!this.moduleTaskTypes.has(taskType)) return undefined;
          if (mode === 'remote') {
            return { url: remote!.url.replace(/\/$/, ''), token: remote!.token };
          }
          // No supervisor (no task bundles when running from source) or no bundle for this task
          // type: it is not routed to a process, and runs in this process instead.
          if (!this.taskProcessSupervisor?.serves(taskType)) return undefined;
          return this.taskProcessSupervisor.getRoute(taskType);
        },
      };
    }

    this.taskManagerId = this.initContext.env.instanceUuid;

    if (!this.taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${this.taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${this.taskManagerId}`);
    }

    this.usageCounter = plugins.usageCollection?.createUsageCounter(`taskManager`);

    // Routes
    const router = core.http.createRouter();
    const { serviceStatus$, monitoredHealth$ } = healthRoute({
      router,
      monitoringStats$: this.monitoringStats$,
      logger: this.logger,
      taskManagerId: this.taskManagerId,
      config: this.config!,
      usageCounter: this.usageCounter!,
      kibanaVersion: this.kibanaVersion,
      kibanaIndexName: core.savedObjects.getDefaultIndex(),
      getClusterClient: () => clusterClientPromise,
      shouldRunTasks: this.shouldRunBackgroundTasks,
      docLinks: core.docLinks,
      numOfKibanaInstances$: this.numOfKibanaInstances$,
    });
    const monitoredUtilization$ = backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: this.monitoringStats$,
      logger: this.logger,
      taskManagerId: this.taskManagerId,
      config: this.config!,
      usageCounter: this.usageCounter!,
      kibanaVersion: this.kibanaVersion,
      kibanaIndexName: core.savedObjects.getDefaultIndex(),
      getClusterClient: () => clusterClientPromise,
    });
    metricsRoute({
      router,
      logger: this.logger,
      metrics$: this.metrics$,
      resetMetrics$: this.resetMetrics$,
      taskManagerId: this.taskManagerId,
    });
    executionControlRoutes({
      router,
      logger: this.logger,
      // getStartServices resolves after start(), by which point the service and
      // the full task-type dictionary are available on every node.
      getSecurity: () => core.getStartServices().then(([coreStart]) => coreStart.security),
      getExecutionControlService: () =>
        core.getStartServices().then(() => this.executionControlService!),
      getDefinitions: () => this.definitions,
    });

    core.status.derivedStatus$.subscribe((status) =>
      this.logger.debug(`status core.status.derivedStatus now set to ${status.level}`)
    );
    serviceStatus$.subscribe((status) =>
      this.logger.debug(`status serviceStatus now set to ${status.level}`)
    );

    // here is where the system status is updated
    core.status.set(
      combineLatest([core.status.derivedStatus$, serviceStatus$]).pipe(
        map(([derivedStatus, serviceStatus]) =>
          serviceStatus.level >= derivedStatus.level ? serviceStatus : derivedStatus
        )
      )
    );

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerTaskManagerUsageCollector(
        usageCollection,
        monitoredHealth$,
        monitoredUtilization$,
        this.config.unsafe.exclude_task_types,
        () => core.getStartServices().then(([, , startContract]) => startContract),
        this.logger
      );
    }

    registerEventLogTelemetryTask(this.logger, core.getStartServices, this.definitions);
    registerTaskType(deleteInactiveNodesTaskType);
    registerInvalidateApiKeyTask({
      configInterval: this.config.invalidate_api_key_task.interval,
      coreStartServices: core.getStartServices,
      getEncryptedSavedObjectsClient: () => this.taskStore?.getEncryptedSavedObjectsClient(),
      invalidateApiKeyFn: this.invalidateApiKey.bind(this),
      invalidateUiamApiKeyFn: () => this.invalidateUiamApiKey,
      logger: this.logger,
      removalDelay: this.config.invalidate_api_key_task.removalDelay,
      taskTypeDictionary: this.definitions,
    });
    registerTaskType(markRemovedTasksTaskType);

    if (this.config.unsafe.exclude_task_types.length) {
      this.logger.warn(
        `Excluding task types from execution: ${this.config.unsafe.exclude_task_types.join(', ')}`
      );
    }

    if (this.config.unsafe.authenticate_background_task_utilization === false) {
      this.logger.warn(`Disabling authentication for background task utilization API`);
    }

    // for nodes with background_tasks mode only, log health metrics every hour
    if (this.isNodeBackgroundTasksOnly()) {
      setupIntervalLogging(monitoredHealth$, this.logger, LogHealthForBackgroundTasksOnlyMinutes);
    }

    this.enrichFakeRequest = core.security.acquireFakeRequestEnricher();

    return {
      index: TASK_MANAGER_INDEX,
      addMiddleware: (middleware: Middleware, options?: { id: string }) => {
        if (options) {
          if (!options.id.trim())
            throw new Error('Task scheduling middleware requires a nonempty id');
          if (this.schedulingMiddlewareIds.includes(options.id))
            throw new Error(`Task scheduling middleware ${options.id} is already registered`);
          this.schedulingMiddlewareIds.push(options.id);
        } else {
          this.anonymousSchedulingMiddlewareCount++;
        }
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: TaskDefinitionRegistry) => {
        this.definitions.registerTaskDefinitions(taskDefinition);
      },
      registerTaskType,
      /** Supplies the owning encrypted saved objects service's current task encryption keys. */
      registerTaskProcessEncryptionKeys: (getKeys) => {
        this.getTaskProcessEncryptionKeys = getKeys;
      },
      registerCanEncryptedSavedObjects: (canEncrypt: boolean) => {
        this.canEncryptSavedObjects = canEncrypt;
      },
      registerTaskEventLogger: (logger: TaskEventLogger) => {
        this.taskEventLogger = logger;
      },
    };
  }

  public start(
    core: CoreStart,
    { cloud, licensing }: TaskManagerPluginsStart
  ): TaskManagerStartContract {
    this.logger.info(`Task Manager is starting in Kibana process ${process.pid}`);
    const { savedObjects, elasticsearch, executionContext, security } = core;
    this.featureFlagsService = core.featureFlags;
    const enrichFakeRequest = this.enrichFakeRequest;
    this.licenseSubscriber = new LicenseSubscriber(licensing.license$);
    const isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';

    const savedObjectsRepository = savedObjects.createInternalRepository([
      TASK_SO_NAME,
      BACKGROUND_TASK_NODE_SO_NAME,
      INVALIDATE_API_KEY_SO_NAME,
      TASK_EXECUTION_CONTROL_SO_NAME,
    ]);

    if (this.config.claim_nudge.enabled) {
      this.claimNudgeService = new TaskManagerClaimNudgeService({
        logger: this.logger,
        esClient: elasticsearch.client.asInternalUser,
        index: TASK_MANAGER_CLAIM_NUDGE_INDEX,
        isServerless,
      });
    }

    this.kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger: this.logger,
      currentNode: this.taskManagerId!,
      config: this.config.discovery,
      onNodesCounted: (numOfNodes: number) => this.numOfKibanaInstances$.next(numOfNodes),
    });

    if (this.shouldRunBackgroundTasks) {
      this.kibanaDiscoveryService.start().catch(() => {});
    }

    // Runs on every node (including UI-only nodes) so the pause/resume API and
    // health output are consistent everywhere; enforcement only happens where a
    // TaskPollingLifecycle exists (background-task nodes).
    this.executionControlService = new TaskExecutionControlService({
      savedObjectsRepository,
      logger: this.logger,
      config: this.config.execution_control,
    });
    this.executionControlService.start().catch(() => {});

    const serializer = savedObjects.createSerializer();
    const apiKeyStrategy = createApiKeyStrategy(
      this.config.api_key_type,
      this.config.grant_uiam_api_keys,
      security,
      this.logger
    );
    const taskStore = new TaskStore({
      serializer,
      savedObjectsRepository,
      savedObjectsService: savedObjects,
      esClient: elasticsearch.client.asInternalUser,
      index: TASK_MANAGER_INDEX,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
      adHocTaskCounter: this.adHocTaskCounter,
      allowReadingInvalidState: this.config.allow_reading_invalid_state,
      logger: this.logger,
      security,
      canEncryptSavedObjects: this.canEncryptSavedObjects,
      getIsSecurityEnabled: this.licenseSubscriber?.getIsSecurityEnabled,
      executionContext,
      apiKeyStrategy,
    });
    this.taskStore = taskStore;

    const defaultCapacity = getDefaultCapacity({
      autoCalculateDefaultEchCapacity: this.config.auto_calculate_default_ech_capacity,
      claimStrategy: this.config?.claim_strategy,
      heapSizeLimit: this.heapSizeLimit,
      isCloud: cloud?.isCloudEnabled ?? false,
      isServerless,
      isBackgroundTaskNodeOnly: this.isNodeBackgroundTasksOnly(),
    });

    this.logger.info(
      `Task manager isCloud=${
        cloud?.isCloudEnabled ?? false
      } isServerless=${isServerless} claimStrategy=${
        this.config!.claim_strategy
      } isBackgroundTaskNodeOnly=${this.isNodeBackgroundTasksOnly()} heapSizeLimit=${
        this.heapSizeLimit
      } defaultCapacity=${defaultCapacity} autoCalculateDefaultEchCapacity=${
        this.config.auto_calculate_default_ech_capacity
      }`
    );

    const startingCapacity = calculateStartingCapacity(this.config!, this.logger, defaultCapacity);

    // Only poll for tasks if configured to run tasks
    if (this.shouldRunBackgroundTasks) {
      this.claimNudgeService?.start();

      this.taskManagerMetricsCollector = new TaskManagerMetricsCollector({
        logger: this.logger,
        store: taskStore,
        taskTypes: new Set(this.definitions.getAllTypes()),
        excludedTypes: new Set(this.config.unsafe.exclude_task_types),
      });

      const taskPartitioner = new TaskPartitioner({
        logger: this.logger,
        podName: this.taskManagerId!,
        kibanaDiscoveryService: this.kibanaDiscoveryService,
        kibanasPerPartition: this.config.kibanas_per_partition,
      });

      this.startTaskProcessSupervisor();
      this.taskPollingLifecycle = new TaskPollingLifecycle({
        config: this.config!,
        definitions: this.definitions,
        logger: this.logger,
        executionContext,
        taskStore,
        usageCounter: this.usageCounter,
        middleware: this.middleware,
        elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
        executionControlService: this.executionControlService,
        taskPartitioner,
        startingCapacity,
        apiKeyStrategy,
        eventLogger: this.taskEventLogger!,
        enrichFakeRequest,
        taskProcessDispatch: this.taskProcessDispatch,
        claimNudgeService: this.claimNudgeService,
      });
    }

    createMonitoringStats({
      taskStore,
      elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
      config: this.config!,
      logger: this.logger,
      adHocTaskCounter: this.adHocTaskCounter,
      taskDefinitions: this.definitions,
      taskPollingLifecycle: this.taskPollingLifecycle,
      executionControlService: this.executionControlService,
      startingCapacity,
    }).subscribe((stat) => this.monitoringStats$.next(stat));

    metricsStream({
      config: this.config!,
      logger: this.logger,
      reset$: this.resetMetrics$,
      taskPollingLifecycle: this.taskPollingLifecycle,
      taskManagerMetricsCollector: this.taskManagerMetricsCollector,
      definitions: this.definitions,
    }).subscribe((metric) => this.metrics$.next(metric));

    const taskScheduling = new TaskScheduling({
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      taskManagerId: taskStore.taskManagerId,
      definitions: this.definitions,
      taskPollingLifecycle: this.taskPollingLifecycle,
      claimNudgeService: this.claimNudgeService,
    });

    scheduleEventLogTelemetryTask(this.logger, taskScheduling).catch(() => {});
    scheduleDeleteInactiveNodesTaskDefinition(this.logger, taskScheduling).catch(() => {});
    scheduleInvalidateApiKeyTask(
      this.logger,
      taskScheduling,
      this.config.invalidate_api_key_task.interval
    ).catch(() => {});
    scheduleMarkRemovedTasksAsUnrecognizedDefinition(this.logger, taskScheduling).catch(() => {});

    this.startContract = {
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      aggregate: (opts: AggregationOpts): Promise<estypes.SearchResponse<ConcreteTaskInstance>> =>
        taskStore.aggregate(opts),
      get: (id: string) => taskStore.get(id),
      bulkGet: (...args) => taskStore.bulkGet(...args),
      remove: (id: string) => taskStore.remove(id),
      bulkRemove: (ids: string[]) => taskStore.bulkRemove(ids),
      removeIfExists: (id: string) => removeIfExists(taskStore, id),
      schedule: (...args) => taskScheduling.schedule(...args),
      bulkSchedule: (...args) => taskScheduling.bulkSchedule(...args),
      ensureScheduled: (...args) => taskScheduling.ensureScheduled(...args),
      runSoon: (...args) => taskScheduling.runSoon(...args),
      bulkEnable: (...args) => taskScheduling.bulkEnable(...args),
      bulkDisable: (...args) => taskScheduling.bulkDisable(...args),
      bulkUpdateSchedules: (...args) => taskScheduling.bulkUpdateSchedules(...args),
      getRegisteredTypes: () => this.definitions.getAllTypes(),
      getTaskProcessStats: () => ({
        mode: this.config.task_execution?.mode ?? DEFAULT_TASK_EXECUTION_MODE,
        dispatchFailures: this.taskProcessDispatchFailures.getCounts(),
        processes: this.taskProcessSupervisor?.getStats(),
      }),
      getTaskBundlePacks: (taskType) => this.taskProcessSupervisor?.getTaskBundlePacks(taskType),
      bulkUpdateState: (...args) => taskScheduling.bulkUpdateState(...args),
      registerEncryptedSavedObjectsClient: (
        client: EncryptedSavedObjectsClient,
        isEncryptionError?: (error: Error) => boolean
      ) => {
        taskStore.registerEncryptedSavedObjectsClient(client, isEncryptionError);
      },
      registerApiKeyInvalidateFn: (fn?: ApiKeyInvalidationFn) => {
        this.invalidateApiKeyFn = fn;
      },
      registerUiamApiKeyInvalidateFn: (fn?: UiamApiKeyInvalidationFn) => {
        this.invalidateUiamApiKeyFn = fn;
      },
    };

    return this.startContract;
  }

  /**
   * In `child_process` mode, lets task types with a bundle run in a process Kibana starts for each
   * run, with Kibana's own Elasticsearch connection. A task type that is registered but has no
   * bundle runs in this process instead.
   */
  private startTaskProcessSupervisor() {
    const {
      mode = DEFAULT_TASK_EXECUTION_MODE,
      bundle_dir: bundleDir,
      max_concurrent_processes: maxConcurrentProcesses,
      child_max_old_space_mb: childMaxOldSpaceMb,
      child_max_semi_space_mb: childMaxSemiSpaceMb,
      reuse,
    } = this.config.task_execution ?? {};
    if (mode !== 'child_process') return;
    const isDist = this.initContext.env.packageInfo.dist;
    const resolvedBundleDir =
      bundleDir ?? join(REPO_ROOT, isDist ? 'task_bundles' : 'target/task_bundles');
    // Running from source with no explicit `bundle_dir` and no bundles built: every task type runs
    // in this process. A distributable, or an explicit `bundle_dir`, still requires the manifest.
    if (!bundleDir && !isDist && !existsSync(join(resolvedBundleDir, 'manifest.json'))) {
      this.logger.warn(
        `No task bundle manifest at ${resolvedBundleDir}; running from source with no task bundles built (node scripts/task_bundle), so every task type runs in this process`
      );
      return;
    }
    try {
      this.taskProcessSupervisor = new TaskProcessSupervisor({
        settings: {
          bundle_dir: resolvedBundleDir,
          kibanaVersion: this.kibanaVersion,
          maxConcurrentProcesses: maxConcurrentProcesses ?? this.config.max_workers,
          childMaxOldSpaceMb,
          childMaxSemiSpaceMb,
          reuse: reuse?.enabled
            ? {
                idleTimeoutMs: reuse.idle_timeout_ms,
                maxAgeMs: reuse.max_age_ms,
                maxRuns: reuse.max_runs,
                maxIdleProcesses: reuse.max_idle_processes,
              }
            : undefined,
          getElasticsearchConfig: () => serializeElasticsearchConfig(this.elasticsearchConfig!),
          getInitFor: async (taskType) => (await this.getTaskProcessInit?.(taskType)) ?? {},
        },
        logger: this.logger,
      });
      this.taskProcessSupervisor.start([...this.moduleTaskTypes]);
      const served = this.taskProcessSupervisor.getTaskTypes();
      const unserved = [...this.moduleTaskTypes].filter((type) => !served.includes(type));
      this.logger.info(
        `Task processes serve ${served.length} task type(s); ${unserved.length} registered task ` +
          `type(s) have no task bundle and run in this process${
            unserved.length ? ` (${unserved.join(', ')})` : ''
          }; reuse is ${reuse?.enabled ? 'on' : 'off'}`
      );
    } catch (error) {
      this.taskProcessSupervisor = undefined;
      this.logger.error(`Task processes could not start: ${error.message}`);
      throw error;
    }
  }

  public async stop() {
    this.unregisterGaugeSource?.();
    if (this.taskProcessSupervisor) {
      const stats = this.startContract?.getTaskProcessStats();
      this.logger.info(`Task processes at shutdown: ${JSON.stringify(stats)}`);
    }
    await this.taskProcessSupervisor?.stop();
    this.licenseSubscriber?.cleanup();
    this.claimNudgeService?.stop();

    // Stop polling for tasks
    if (this.taskPollingLifecycle) {
      this.taskPollingLifecycle.stop();
    }

    this.executionControlService?.stop();

    if (this.kibanaDiscoveryService?.isStarted()) {
      this.kibanaDiscoveryService.stop();
      try {
        await this.kibanaDiscoveryService.deleteCurrentNode();
      } catch (e) {
        this.logger.error(`Deleting current node has failed. error: ${e.message}`);
      }
    }
  }
}
