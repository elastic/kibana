/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
  UsageCounter,
} from '@kbn/usage-collection-plugin/server';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  CoreStart,
  ServiceStatusLevels,
  CoreStatus,
} from '@kbn/core/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import {
  registerDeleteInactiveNodesTaskDefinition,
  scheduleDeleteInactiveNodesTaskDefinition,
} from './kibana_discovery_service/delete_inactive_nodes_task';
import { KibanaDiscoveryService } from './kibana_discovery_service';
import { TaskPollingLifecycle } from './polling_lifecycle';
import { TaskManagerConfig } from './config';
import { createInitialMiddleware, addMiddlewareToChain, Middleware } from './lib/middleware';
import { removeIfExists } from './lib/remove_if_exists';
import { setupSavedObjects, BACKGROUND_TASK_NODE_SO_NAME, TASK_SO_NAME } from './saved_objects';
import { TaskDefinitionRegistry, TaskTypeDictionary } from './task_type_dictionary';
import { AggregationOpts, FetchResult, SearchOpts, TaskStore } from './task_store';
import { TaskScheduling } from './task_scheduling';
import { backgroundTaskUtilizationRoute, healthRoute, metricsRoute } from './routes';
import { createMonitoringStats, MonitoringStats } from './monitoring';
import { ConcreteTaskInstance } from './task';
import { registerTaskManagerUsageCollector } from './usage';
import { TASK_MANAGER_INDEX } from './constants';
import { AdHocTaskCounter } from './lib/adhoc_task_counter';
import { setupIntervalLogging } from './lib/log_health_metrics';
import { metricsStream, Metrics } from './metrics';
import { TaskManagerMetricsCollector } from './metrics/task_metrics_collector';
import { TaskPartitioner } from './lib/task_partitioner';
import { getDefaultCapacity } from './lib/get_default_capacity';
import { calculateStartingCapacity } from './lib/create_managed_configuration';
import {
  registerMarkRemovedTasksAsUnrecognizedDefinition,
  scheduleMarkRemovedTasksAsUnrecognizedDefinition,
} from './removed_tasks/mark_removed_tasks_as_unrecognized';

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
  Pick<TaskStore, 'fetch' | 'aggregate' | 'get' | 'remove' | 'bulkRemove'> & {
    removeIfExists: TaskStore['remove'];
  } & {
    getRegisteredTypes: () => string[];
  };

export interface TaskManagerPluginsStart {
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
  private taskManagerMetricsCollector?: TaskManagerMetricsCollector;
  private nodeRoles: PluginInitializerContext['node']['roles'];
  private kibanaDiscoveryService?: KibanaDiscoveryService;
  private heapSizeLimit: number = 0;
  private numOfKibanaInstances$: Subject<number> = new BehaviorSubject(1);

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<TaskManagerConfig>();
    this.definitions = new TaskTypeDictionary(this.logger);
    this.kibanaVersion = initContext.env.packageInfo.version;
    this.nodeRoles = initContext.node.roles;
    this.shouldRunBackgroundTasks = this.nodeRoles.backgroundTasks;
    this.adHocTaskCounter = new AdHocTaskCounter();
  }

  isNodeBackgroundTasksOnly() {
    const { backgroundTasks, migrator, ui } = this.nodeRoles;
    return backgroundTasks && !migrator && !ui;
  }

  public setup(
    core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>,
    plugins: TaskManagerPluginsSetup
  ): TaskManagerSetupContract {
    this.elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability(core.status.core$);

    core.metrics
      .getOpsMetrics$()
      .pipe(distinctUntilChanged())
      .subscribe((metrics) => {
        this.heapSizeLimit = metrics.process.memory.heap.size_limit;
      });

    setupSavedObjects(core.savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    if (!this.taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${this.taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${this.taskManagerId}`);
    }

    const startServicesPromise = core.getStartServices().then(([coreServices]) => ({
      elasticsearch: coreServices.elasticsearch,
    }));

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
      getClusterClient: () =>
        startServicesPromise.then(({ elasticsearch }) => elasticsearch.client),
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
      getClusterClient: () =>
        startServicesPromise.then(({ elasticsearch }) => elasticsearch.client),
    });
    metricsRoute({
      router,
      logger: this.logger,
      metrics$: this.metrics$,
      resetMetrics$: this.resetMetrics$,
      taskManagerId: this.taskManagerId,
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
    registerMarkRemovedTasksAsUnrecognizedDefinition(
      this.logger,
      core.getStartServices,
      this.definitions
    );

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
    };
  }

  public start(
    { savedObjects, elasticsearch, executionContext, docLinks }: CoreStart,
    { cloud }: TaskManagerPluginsStart
  ): TaskManagerStartContract {
    const savedObjectsRepository = savedObjects.createInternalRepository([
      TASK_SO_NAME,
      BACKGROUND_TASK_NODE_SO_NAME,
    ]);

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

    const serializer = savedObjects.createSerializer();
    const taskStore = new TaskStore({
      serializer,
      savedObjectsRepository,
      esClient: elasticsearch.client.asInternalUser,
      index: TASK_MANAGER_INDEX,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
      adHocTaskCounter: this.adHocTaskCounter,
      allowReadingInvalidState: this.config.allow_reading_invalid_state,
      logger: this.logger,
      requestTimeouts: this.config.request_timeouts,
    });

    const isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';

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
    });

    scheduleDeleteInactiveNodesTaskDefinition(this.logger, taskScheduling).catch(() => {});
    scheduleMarkRemovedTasksAsUnrecognizedDefinition(this.logger, taskScheduling).catch(() => {});

    return {
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      aggregate: (opts: AggregationOpts): Promise<estypes.SearchResponse<ConcreteTaskInstance>> =>
        taskStore.aggregate(opts),
      get: (id: string) => taskStore.get(id),
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
    };
  }

  public async stop() {
    // Stop polling for tasks
    if (this.taskPollingLifecycle) {
      this.taskPollingLifecycle.stop();
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
