/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { combineLatest, Subject, BehaviorSubject } from 'rxjs';
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
import { hostname } from 'node:os';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InvalidateAPIKeysParams } from '@kbn/security-plugin-types-server';
import {
  registerDeleteInactiveNodesTaskDefinition,
  scheduleDeleteInactiveNodesTaskDefinition,
} from './kibana_discovery_service/delete_inactive_nodes_task';
import { KibanaDiscoveryService } from './kibana_discovery_service';
import { TaskPollingLifecycle } from './polling_lifecycle';
import type { TaskManagerConfig } from './config';
import type { Middleware } from './lib/middleware';
import { createInitialMiddleware, addMiddlewareToChain } from './lib/middleware';
import { removeIfExists } from './lib/remove_if_exists';
import {
  setupSavedObjects,
  BACKGROUND_TASK_NODE_SO_NAME,
  TASK_SO_NAME,
  INVALIDATE_API_KEY_SO_NAME,
} from './saved_objects';
import type { TaskDefinitionRegistry } from './task_type_dictionary';
import { TaskTypeDictionary } from './task_type_dictionary';
import type { AggregationOpts, FetchResult, SearchOpts } from './task_store';
import { TaskStore } from './task_store';
import { TaskScheduling } from './task_scheduling';
import {
  backgroundTaskUtilizationRoute,
  claimNudgeRoute,
  healthRoute,
  metricsRoute,
} from './routes';
import type { MonitoringStats } from './monitoring';
import { createMonitoringStats } from './monitoring';
import { TaskPriority, type ConcreteTaskInstance, type TaskEventLogger } from './task';
import { registerTaskManagerUsageCollector } from './usage';
import { TASK_MANAGER_INDEX } from './constants';
import { AdHocTaskCounter } from './lib/adhoc_task_counter';
import { setupIntervalLogging } from './lib/log_health_metrics';
import type { Metrics } from './metrics';
import { metricsStream } from './metrics';
import { TaskManagerMetricsCollector } from './metrics/task_metrics_collector';
import { TaskPartitioner } from './lib/task_partitioner';
import { getDefaultCapacity } from './lib/get_default_capacity';
import { calculateStartingCapacity } from './lib/create_managed_configuration';
import {
  registerMarkRemovedTasksAsUnrecognizedDefinition,
  scheduleMarkRemovedTasksAsUnrecognizedDefinition,
} from './removed_tasks/mark_removed_tasks_as_unrecognized';
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
import {
  GlobalCheckpointsClaimNudgeService,
  HttpClaimNudgeClient,
  HttpClaimNudgeService,
  NoopClaimNudgeService,
} from './claim_nudge';
import {
  CLAIM_NUDGE_STRATEGY_DISABLED,
  CLAIM_NUDGE_STRATEGY_GLOBAL_CHECKPOINTS,
  CLAIM_NUDGE_STRATEGY_HTTP,
} from './config';
import type { TaskManagerClaimNudgeService } from './claim_nudge';

export interface TaskManagerSetupContract {
  /**
   * @deprecated
   */
  index: string;
  addMiddleware: (middleware: Middleware) => void;
  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  registerTaskDefinitions: (taskDefinitions: TaskDefinitionRegistry) => void;
  registerCanEncryptedSavedObjects: (canEncrypt: boolean) => void;
  registerTaskEventLogger: (logger: TaskEventLogger) => void;
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
    registerEncryptedSavedObjectsClient: (client: EncryptedSavedObjectsClient) => void;
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
const TaskManagerLatencyProbeTaskType = 'task_manager:latency_probe';
const TaskManagerLatencyProbeIntervalMs = 10_000;

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
  private taskManagerMetricsCollector?: TaskManagerMetricsCollector;
  private nodeRoles: PluginInitializerContext['node']['roles'];
  private kibanaDiscoveryService?: KibanaDiscoveryService;
  private heapSizeLimit: number = 0;
  private numOfKibanaInstances$: Subject<number> = new BehaviorSubject(1);
  private canEncryptSavedObjects: boolean;
  private licenseSubscriber?: PublicMethodsOf<LicenseSubscriber>;
  private claimNudgeService?: TaskManagerClaimNudgeService;
  private invalidateApiKeyFn?: ApiKeyInvalidationFn;
  private taskEventLogger?: TaskEventLogger;
  private invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn;
  private taskStore?: TaskStore;
  private startContract?: TaskManagerStartContract;
  private probeScheduleIntervalId?: NodeJS.Timeout;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
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

  private deriveNodeAddress({
    host,
    port,
    protocol,
  }: {
    host: string;
    port: number;
    protocol: 'http' | 'https' | 'socket';
  }) {
    const podIp = process.env.POD_IP;
    const osHostname = hostname();
    this.logger.info(
      `[claim_nudge] address_resolution_inputs server.host=${host} server.port=${port} protocol=${protocol} pod_ip=${
        podIp ?? 'undefined'
      } os_hostname=${osHostname}`
    );

    if (protocol === 'socket') {
      this.logger.info('[claim_nudge] self_address=null (socket protocol is not supported)');
      return undefined;
    }

    if (host === 'localhost' || host === '127.0.0.1') {
      this.logger.info(
        `[claim_nudge] self_address=null (server.host=${host} is not externally reachable, HTTP nudge will not advertise this node)`
      );
      return undefined;
    }

    const resolvedHost = host === '0.0.0.0' || host === '::' ? podIp || osHostname : host;
    const address = `${protocol}://${resolvedHost}:${port}`;

    this.logger.info(
      `[claim_nudge] self_address=${address} (hostname=${resolvedHost}, port=${port}, protocol=${protocol})`
    );
    return address;
  }

  private getClaimNudgeStrategy(isServerless: boolean) {
    if (this.config.claim_nudge.strategy === CLAIM_NUDGE_STRATEGY_DISABLED) {
      this.logger.info('[claim_nudge] strategy=disabled (explicit config)');
      return CLAIM_NUDGE_STRATEGY_DISABLED;
    }

    if (
      isServerless &&
      this.config.claim_nudge.strategy === CLAIM_NUDGE_STRATEGY_GLOBAL_CHECKPOINTS
    ) {
      this.logger.info('[claim_nudge] strategy=http (auto-detected: serverless=true)');
      return CLAIM_NUDGE_STRATEGY_HTTP;
    }

    this.logger.info(`[claim_nudge] strategy=${this.config.claim_nudge.strategy}`);
    return this.config.claim_nudge.strategy;
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
    claimNudgeRoute({
      router,
      logger: this.logger,
      shouldRunTasks: this.shouldRunBackgroundTasks,
      onClaimNudge: (source: string) => this.claimNudgeService?.emitLocalNudge(source),
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
        this.config.unsafe.exclude_task_types
      );
    }

    registerDeleteInactiveNodesTaskDefinition(this.logger, core.getStartServices, this.definitions);
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
    registerMarkRemovedTasksAsUnrecognizedDefinition(
      this.logger,
      core.getStartServices,
      this.definitions
    );
    this.definitions.registerTaskDefinitions({
      [TaskManagerLatencyProbeTaskType]: {
        title: 'Task Manager latency probe',
        timeout: '5m',
        priority: TaskPriority.Normal,
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const startedAtMs = Date.now();
            const params = (taskInstance.params ?? {}) as { scheduleRequestedAtMs?: number };
            const scheduleRequestedAtMs = params.scheduleRequestedAtMs ?? 0;
            const scheduledAtMs = taskInstance.scheduledAt.valueOf();

            this.logger.info(
              `[tm_latency_probe] run_started_at=${new Date(
                startedAtMs
              ).toISOString()} schedule_requested_at=${new Date(
                scheduleRequestedAtMs
              ).toISOString()} task_scheduled_at=${taskInstance.scheduledAt.toISOString()} delta_from_requested_ms=${
                startedAtMs - scheduleRequestedAtMs
              } delta_from_scheduled_ms=${startedAtMs - scheduledAtMs}`
            );

            return {
              state: {},
              shouldDeleteTask: true,
            };
          },
        }),
      },
    });

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

    return {
      index: TASK_MANAGER_INDEX,
      addMiddleware: (middleware: Middleware) => {
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: TaskDefinitionRegistry) => {
        this.definitions.registerTaskDefinitions(taskDefinition);
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
    { http, savedObjects, elasticsearch, executionContext, security }: CoreStart,
    { cloud, licensing }: TaskManagerPluginsStart
  ): TaskManagerStartContract {
    this.licenseSubscriber = new LicenseSubscriber(licensing.license$);
    const isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';
    const claimNudgeStrategy = this.getClaimNudgeStrategy(isServerless);
    const nodeAddress = this.deriveNodeAddress({
      host: http.getServerInfo().hostname,
      port: http.getServerInfo().port,
      protocol: http.getServerInfo().protocol,
    });

    const savedObjectsRepository = savedObjects.createInternalRepository([
      TASK_SO_NAME,
      BACKGROUND_TASK_NODE_SO_NAME,
      INVALIDATE_API_KEY_SO_NAME,
    ]);

    this.kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger: this.logger,
      currentNode: this.taskManagerId!,
      nodeAddress,
      config: this.config.discovery,
      onNodesCounted: (numOfNodes: number) => this.numOfKibanaInstances$.next(numOfNodes),
    });

    if (this.shouldRunBackgroundTasks) {
      this.kibanaDiscoveryService.start().catch(() => {});
    }

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
      requestTimeouts: this.config.request_timeouts,
      security,
      canEncryptSavedObjects: this.canEncryptSavedObjects,
      getIsSecurityEnabled: this.licenseSubscriber?.getIsSecurityEnabled,
      basePath: http.basePath,
      executionContext,
      apiKeyStrategy,
    });
    this.taskStore = taskStore;
    if (claimNudgeStrategy === CLAIM_NUDGE_STRATEGY_HTTP) {
      const claimNudgeClient = new HttpClaimNudgeClient({
        logger: this.logger,
        kibanaDiscoveryService: this.kibanaDiscoveryService,
        timeoutMs: this.config.claim_nudge.http_timeout_ms,
        serverBasePath: http.basePath.serverBasePath,
      });
      this.claimNudgeService = new HttpClaimNudgeService(this.logger, claimNudgeClient);
    } else if (claimNudgeStrategy === CLAIM_NUDGE_STRATEGY_GLOBAL_CHECKPOINTS) {
      this.claimNudgeService = new GlobalCheckpointsClaimNudgeService(this.logger);
    } else {
      this.claimNudgeService = new NoopClaimNudgeService(this.logger);
    }
    if (this.shouldRunBackgroundTasks) {
      this.claimNudgeService.start();
    }

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

      this.taskPollingLifecycle = new TaskPollingLifecycle({
        basePathService: http.basePath,
        config: this.config!,
        definitions: this.definitions,
        logger: this.logger,
        executionContext,
        taskStore,
        usageCounter: this.usageCounter,
        middleware: this.middleware,
        elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
        taskPartitioner,
        startingCapacity,
        apiKeyStrategy,
        eventLogger: this.taskEventLogger!,
        claimNudge$: this.claimNudgeService?.claimNudge$,
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
      startingCapacity,
    }).subscribe((stat) => this.monitoringStats$.next(stat));

    metricsStream({
      config: this.config!,
      logger: this.logger,
      reset$: this.resetMetrics$,
      taskPollingLifecycle: this.taskPollingLifecycle,
      taskManagerMetricsCollector: this.taskManagerMetricsCollector,
    }).subscribe((metric) => this.metrics$.next(metric));

    const taskScheduling = new TaskScheduling({
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      taskManagerId: taskStore.taskManagerId,
      taskPollingLifecycle: this.taskPollingLifecycle,
      claimNudgeService: this.claimNudgeService,
    });

    if (this.shouldRunBackgroundTasks) {
      const scheduleProbeTask = () => {
        const scheduleRequestedAtMs = Date.now();
        const probeTaskId = `tm-latency-probe-${this.taskManagerId}-${scheduleRequestedAtMs}`;
        this.logger.info(
          `[tm_latency_probe] scheduling_one_time_task id=${probeTaskId} schedule_requested_at=${new Date(
            scheduleRequestedAtMs
          ).toISOString()}`
        );

        taskScheduling
          .schedule(
            {
              id: probeTaskId,
              taskType: TaskManagerLatencyProbeTaskType,
              params: { scheduleRequestedAtMs },
              state: {},
              enabled: true,
              priority: TaskPriority.Normal,
            },
            { requestImmediateClaim: true }
          )
          .then(() => {
            const persistedAtMs = Date.now();
            this.logger.info(
              `[tm_latency_probe] task_scheduled id=${probeTaskId} persisted_at=${new Date(
                persistedAtMs
              ).toISOString()} persistence_delta_ms=${persistedAtMs - scheduleRequestedAtMs}`
            );
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.info(`[tm_latency_probe] failed_scheduling id=${probeTaskId}: ${message}`);
          });
      };

      scheduleProbeTask();
      this.logger.info(
        `[tm_latency_probe] using setInterval(${TaskManagerLatencyProbeIntervalMs}ms) to schedule one-time probe tasks`
      );
      this.probeScheduleIntervalId = setInterval(
        scheduleProbeTask,
        TaskManagerLatencyProbeIntervalMs
      );
    }

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
      bulkUpdateState: (...args) => taskScheduling.bulkUpdateState(...args),
      registerEncryptedSavedObjectsClient: (client: EncryptedSavedObjectsClient) => {
        taskStore.registerEncryptedSavedObjectsClient(client);
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

  public async stop() {
    this.licenseSubscriber?.cleanup();

    // Stop polling for tasks
    if (this.taskPollingLifecycle) {
      this.taskPollingLifecycle.stop();
    }
    this.claimNudgeService?.stop();
    if (this.probeScheduleIntervalId) {
      clearInterval(this.probeScheduleIntervalId);
      this.probeScheduleIntervalId = undefined;
    }

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
