/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerPlugin } from './plugin';
import { KibanaDiscoveryService } from './kibana_discovery_service';

import { coreMock } from '@kbn/core/server/mocks';
import { ApiKeyType, type TaskManagerConfig } from './config';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { taskPollingLifecycleMock } from './polling_lifecycle.mock';
import { TaskPollingLifecycle } from './polling_lifecycle';
import type { TaskPollingLifecycle as TaskPollingLifecycleClass } from './polling_lifecycle';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { TaskManagerClaimNudgeService } from './claim_nudge/claim_nudge_service';
import { TASK_MANAGER_CLAIM_NUDGE_INDEX } from './constants';
import { defineTaskType } from './task_type_module';
import { TaskProcessSupervisor } from './task_process/supervisor';
import { of } from 'rxjs';
import moment from 'moment';
import type { RunContext } from './task';

let mockTaskPollingLifecycle = taskPollingLifecycleMock.create({});
jest.mock('./polling_lifecycle', () => {
  return {
    TaskPollingLifecycle: jest.fn().mockImplementation(() => {
      return mockTaskPollingLifecycle;
    }),
  };
});

// `start()` issues a long-polling ES request, which never resolves against a mocked ES client.
const mockClaimNudgeService = {
  start: jest.fn(),
  stop: jest.fn(),
  notify: jest.fn(),
};
jest.mock('./claim_nudge/claim_nudge_service', () => {
  return {
    TaskManagerClaimNudgeService: jest.fn().mockImplementation(() => {
      return mockClaimNudgeService;
    }),
  };
});

const mockSupervisor = {
  start: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  getRoute: jest.fn(),
};
jest.mock('./task_process/supervisor', () => ({
  TaskProcessSupervisor: jest.fn().mockImplementation(() => mockSupervisor),
}));

const deleteCurrentNodeSpy = jest.spyOn(KibanaDiscoveryService.prototype, 'deleteCurrentNode');
const discoveryIsStarted = jest.spyOn(KibanaDiscoveryService.prototype, 'isStarted');

const coreStart = coreMock.createStart();
const pluginInitializerContextParams = {
  max_attempts: 9,
  poll_interval: 3000,
  version_conflict_threshold: 80,
  invalidate_api_key_task: {
    interval: '5m',
    removalDelay: '1h',
  },
  request_capacity: 1000,
  allow_reading_invalid_state: false,
  discovery: {
    active_nodes_lookback: '30s',
    interval: 10000,
  },
  execution_control: {
    poll_interval: 5000,
  },
  kibanas_per_partition: 2,
  monitored_aggregated_stats_refresh_rate: 5000,
  monitored_stats_health_verbose_log: {
    enabled: false,
    level: 'debug' as const,
    warn_delayed_task_start_in_seconds: 60,
  },
  monitored_stats_required_freshness: 5000,
  monitored_stats_running_average_window: 50,
  monitored_task_execution_thresholds: {
    default: {
      error_threshold: 90,
      warn_threshold: 80,
    },
    custom: {},
  },
  unsafe: {
    exclude_task_types: [],
    authenticate_background_task_utilization: true,
  },
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000,
  },
  worker_utilization_running_average_window: 5,
  metrics_reset_interval: 3000,
  claim_strategy: 'update_by_query',
  request_timeouts: {
    update_by_query: 1000,
  },
  auto_calculate_default_ech_capacity: false,
  api_key_type: ApiKeyType.ES,
  grant_uiam_api_keys: false,
  claim_nudge: {
    enabled: true,
  },
};

describe('TaskManagerPlugin', () => {
  beforeEach(() => {
    mockTaskPollingLifecycle = taskPollingLifecycleMock.create({});
    (TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).mockClear();
    (TaskManagerClaimNudgeService as jest.Mock).mockClear();
    mockClaimNudgeService.start.mockClear();
    mockClaimNudgeService.stop.mockClear();
    mockClaimNudgeService.notify.mockClear();
  });

  describe('setup', () => {
    test('throws if no valid UUID is available', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );

      pluginInitializerContext.env.instanceUuid = '';

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      expect(() =>
        taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined })
      ).toThrow(
        new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`)
      );
    });

    test('it logs a warning when the unsafe `exclude_task_types` config is used', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        unsafe: {
          exclude_task_types: ['*'],
          authenticate_background_task_utilization: true,
        },
      });

      const logger = pluginInitializerContext.logger.get();
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
      expect((logger.warn as jest.Mock).mock.calls[0][0]).toBe(
        'Excluding task types from execution: *'
      );
    });

    test('it logs a warning when the unsafe `authenticate_background_task_utilization` config is set to false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        unsafe: {
          exclude_task_types: [],
          authenticate_background_task_utilization: false,
        },
      });

      const logger = pluginInitializerContext.logger.get();
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
      expect((logger.warn as jest.Mock).mock.calls[0][0]).toBe(
        'Disabling authentication for background task utilization API'
      );
    });
  });

  describe('registerTaskType', () => {
    const setupPlugin = () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      const plugin = new TaskManagerPlugin(pluginInitializerContext);
      const core = coreMock.createSetup();
      const startServices = coreMock.createStart();
      core.getStartServices.mockResolvedValue([startServices, {} as never, {} as never]);
      const setup = plugin.setup(core, { usageCollection: undefined });
      return { plugin, setup, startServices, logger: pluginInitializerContext.logger.get() };
    };

    test('registers the task types of Task Manager itself as modules', () => {
      const { plugin } = setupPlugin();
      const definitions = (plugin as unknown as { definitions: { has(type: string): boolean } })
        .definitions;
      expect(definitions.has('task_manager:delete_inactive_background_task_nodes')).toBe(true);
      expect(definitions.has('task_manager:mark_removed_tasks_as_unrecognized')).toBe(true);
    });

    test('runs a module with Core as its host', async () => {
      const { plugin, setup, startServices, logger } = setupPlugin();
      const createTaskRunner = jest.fn().mockReturnValue({ run: async () => ({ state: {} }) });
      setup.registerTaskType(defineTaskType({ type: 'test:module', createTaskRunner }));

      const definitions = (
        plugin as unknown as {
          definitions: {
            get(type: string): {
              createTaskRunner(context: RunContext): { run(): Promise<unknown> };
            };
          };
        }
      ).definitions;
      const context = {} as RunContext;
      await definitions.get('test:module')!.createTaskRunner(context).run();

      expect(createTaskRunner).toHaveBeenCalledWith(context, {
        logger,
        elasticsearch: startServices.elasticsearch.client,
        savedObjects: startServices.savedObjects,
      });
    });
  });

  describe('task execution', () => {
    const create = (taskExecution?: Record<string, unknown>) => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        ...(taskExecution ? { task_execution: taskExecution } : {}),
      } as TaskManagerConfig);
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const core = coreMock.createSetup();
      (core.elasticsearch.legacy as { config$: unknown }).config$ = of({
        hosts: ['http://es:9200'],
        customHeaders: {},
        requestHeadersWhitelist: [],
        idleSocketTimeout: moment.duration(1000),
        dnsCacheTtl: moment.duration(1000),
        requestTimeout: moment.duration(1000),
        sniffInterval: false,
        ssl: { verificationMode: 'full' },
      });
      const plugin = new TaskManagerPlugin(pluginInitializerContext);
      const setup = plugin.setup(core, { usageCollection: undefined });
      setup.registerTaskType(
        defineTaskType({
          type: 'test:module',
          createTaskRunner: () => ({ run: async () => ({ state: {} }) }),
        })
      );
      plugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });
      const { taskProcessDispatch } = (TaskPollingLifecycle as jest.Mock).mock.calls.at(-1)[0];
      return { plugin, taskProcessDispatch };
    };

    beforeEach(() => {
      (TaskProcessSupervisor as unknown as jest.Mock).mockClear();
      mockSupervisor.start.mockClear();
      mockSupervisor.stop.mockClear();
      mockSupervisor.getRoute.mockClear();
    });

    test('runs every task in this process by default', () => {
      const { taskProcessDispatch } = create();
      expect(taskProcessDispatch).toBeUndefined();
      expect(TaskProcessSupervisor).not.toHaveBeenCalled();
    });

    test('routes the task types registered as modules to the remote pod, and no others', () => {
      const { taskProcessDispatch } = create({
        mode: 'remote',
        remote: { url: 'http://pod:4100/', token: 'secret' },
      });
      expect(taskProcessDispatch.getRoute('test:module')).toEqual({
        url: 'http://pod:4100',
        token: 'secret',
      });
      expect(
        taskProcessDispatch.getRoute('task_manager:delete_inactive_background_task_nodes')
      ).toEqual({
        url: 'http://pod:4100',
        token: 'secret',
      });
      expect(taskProcessDispatch.getRoute('someone:else')).toBeUndefined();
      expect(TaskProcessSupervisor).not.toHaveBeenCalled();
    });

    test('starts the supervisor with the Kibana Elasticsearch connection and stops it', async () => {
      mockSupervisor.getRoute.mockReturnValue({ acquire: jest.fn() });
      const { plugin, taskProcessDispatch } = create({ mode: 'child_process' });
      await new Promise((resolve) => setImmediate(resolve));

      expect(TaskProcessSupervisor).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ getElasticsearchConfig: expect.any(Function) }),
        })
      );
      expect(mockSupervisor.start).toHaveBeenCalledTimes(1);
      expect(taskProcessDispatch.getRoute('test:module')).toEqual({
        acquire: expect.any(Function),
      });
      expect(taskProcessDispatch.getRoute('someone:else')).toBeUndefined();

      await plugin.stop();
      expect(mockSupervisor.stop).toHaveBeenCalledTimes(1);
      deleteCurrentNodeSpy.mockClear();
    });
  });

  describe('start', () => {
    test('should initialize task polling lifecycle if node.roles.backgroundTasks is true', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).toHaveBeenCalledTimes(1);
    });

    test('should not initialize task polling lifecycle if node.roles.backgroundTasks is false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = false;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).not.toHaveBeenCalled();
    });

    test('passes the fake request enricher obtained at setup to TaskPollingLifecycle', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;

      const coreSetup = coreMock.createSetup();
      const enricher = jest.fn();
      (coreSetup.security.acquireFakeRequestEnricher as jest.Mock).mockReturnValue(enricher);

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreSetup, { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(coreSetup.security.acquireFakeRequestEnricher).toHaveBeenCalledTimes(1);
      const pollingLifecycleOpts = (TaskPollingLifecycle as jest.Mock).mock.calls[0][0];
      expect(pollingLifecycleOpts.enrichFakeRequest).toBe(enricher);
    });

    test('should start the claim nudge service if node.roles.backgroundTasks is true and claim_nudge.enabled is true', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(TaskManagerClaimNudgeService as jest.Mock).toHaveBeenCalledTimes(1);
      expect(TaskManagerClaimNudgeService as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          index: TASK_MANAGER_CLAIM_NUDGE_INDEX,
          isServerless: false,
        })
      );
      expect(mockClaimNudgeService.start).toHaveBeenCalledTimes(1);

      const pollingLifecycleOpts = (TaskPollingLifecycle as jest.Mock).mock.calls[0][0];
      expect(pollingLifecycleOpts.claimNudgeService).toBe(mockClaimNudgeService);
    });

    test('should not start the claim nudge service if node.roles.backgroundTasks is false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = false;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(mockClaimNudgeService.start).not.toHaveBeenCalled();
      // Non-polling nodes still construct the service so they can nudge the ones that poll.
      expect(TaskManagerClaimNudgeService as jest.Mock).toHaveBeenCalledTimes(1);
    });

    test('should not construct the claim nudge service when claim_nudge.enabled is false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        claim_nudge: { enabled: false },
      });
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(TaskManagerClaimNudgeService as jest.Mock).not.toHaveBeenCalled();

      const pollingLifecycleOpts = (TaskPollingLifecycle as jest.Mock).mock.calls[0][0];
      expect(pollingLifecycleOpts.claimNudgeService).toBeUndefined();
    });
  });

  describe('stop', () => {
    test('should stop task polling lifecycle if it is defined', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      expect(TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).toHaveBeenCalledTimes(1);

      await taskManagerPlugin.stop();

      expect(mockTaskPollingLifecycle.stop).toHaveBeenCalled();
    });

    test('should not call stop task polling lifecycle if it is not defined', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = false;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      await taskManagerPlugin.stop();

      expect(mockTaskPollingLifecycle.stop).not.toHaveBeenCalled();
    });

    test('should stop the claim nudge service if it is defined', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      await taskManagerPlugin.stop();

      expect(mockClaimNudgeService.stop).toHaveBeenCalledTimes(1);
    });

    test('should not call stop on the claim nudge service when claim_nudge.enabled is false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        claim_nudge: { enabled: false },
      });
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      await taskManagerPlugin.stop();

      expect(mockClaimNudgeService.stop).not.toHaveBeenCalled();
    });

    test('should remove the current from discovery service', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });

      discoveryIsStarted.mockReturnValueOnce(true);
      await taskManagerPlugin.stop();

      expect(deleteCurrentNodeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
