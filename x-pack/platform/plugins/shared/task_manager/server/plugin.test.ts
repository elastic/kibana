/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { EventLoopBlock } from '@kbn/core/server';
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

    describe('event loop blocks', () => {
      const blockedByTask: EventLoopBlock = {
        startedAt: 1_700_000_000_000,
        blockedMs: 6_000,
        phase: 'running',
        contexts: {
          samples: 10,
          withoutContext: 0,
          top: [
            { context: { type: 'task manager', name: 'run example', id: 'task-1' }, samples: 10 },
          ],
        },
      };
      const setupWithBlocks = (backgroundTasks: boolean) => {
        const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
          pluginInitializerContextParams
        );
        pluginInitializerContext.node.roles.backgroundTasks = backgroundTasks;
        const blocks$ = new Subject<EventLoopBlock>();
        const coreSetup = coreMock.createSetup();
        coreSetup.metrics.getEventLoopBlocks$.mockReturnValue(blocks$);
        const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
        taskManagerPlugin.setup(coreSetup, { usageCollection: undefined });
        const { warn } = jest.mocked(pluginInitializerContext.logger.get());
        return { taskManagerPlugin, blocks$, warn };
      };

      test('logs a block of the event loop against the task that ran in it', () => {
        const { blocks$, warn } = setupWithBlocks(true);
        blocks$.next(blockedByTask);
        expect(warn).toHaveBeenCalledWith(
          'event loop blocked for 6000 ms by task example task-1 (10 of 10 samples)',
          { tags: ['example', 'example task-1', 'event-loop-blocked-by-task'] }
        );
      });

      test('does not follow event loop blocks if node.roles.backgroundTasks is false', () => {
        const { blocks$, warn } = setupWithBlocks(false);
        expect(blocks$.observed).toBe(false);
        blocks$.next(blockedByTask);
        expect(warn).not.toHaveBeenCalled();
      });

      test('stops following event loop blocks when the plugin stops', async () => {
        const { taskManagerPlugin, blocks$ } = setupWithBlocks(true);
        expect(blocks$.observed).toBe(true);
        await taskManagerPlugin.stop();
        expect(blocks$.observed).toBe(false);
      });
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
