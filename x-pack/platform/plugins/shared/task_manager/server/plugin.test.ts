/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'fs';
import { TaskManagerPlugin } from './plugin';
import type { TaskManagerSetupContract } from './plugin';
import { createInitialMiddleware } from './lib/middleware';
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
import type { TaskTypeModule, TaskTypeRegistrationOptions } from './task_type_module';
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
  serves: jest.fn().mockReturnValue(true),
  getTaskTypes: jest.fn().mockReturnValue([]),
  getStats: jest.fn().mockReturnValue({
    live: 0,
    peakLive: 0,
    active: 0,
    spawned: 0,
    spawnFailures: 0,
    spawnTimeouts: 0,
    capacityRejections: 0,
  }),
};
jest.mock('./task_process/supervisor', () => ({
  TaskProcessSupervisor: jest.fn().mockImplementation(() => mockSupervisor),
}));

// `startTaskProcessSupervisor` checks the manifest exists before creating the supervisor when
// Kibana is running from source with no explicit `bundle_dir`; tests do not depend on what has
// actually been built on disk.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
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
    // `startTaskProcessSupervisor` checks for a built manifest before creating the supervisor;
    // tests assume bundles exist unless a test explicitly says otherwise.
    (existsSync as jest.Mock).mockReturnValue(true);
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
      return { plugin, setup, core, startServices, logger: pluginInitializerContext.logger.get() };
    };

    test('registers the task types of Task Manager itself as modules', () => {
      const { plugin } = setupPlugin();
      const definitions = (plugin as unknown as { definitions: { has(type: string): boolean } })
        .definitions;
      expect(definitions.has('task_manager:delete_inactive_background_task_nodes')).toBe(true);
      expect(definitions.has('task_manager:mark_removed_tasks_as_unrecognized')).toBe(true);
    });

    test('runs a module with Core as its host', async () => {
      const { plugin, setup, core, startServices, logger } = setupPlugin();
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

      expect(createTaskRunner).toHaveBeenCalledWith(
        context,
        expect.objectContaining({
          logger,
          elasticsearch: startServices.elasticsearch.client,
          savedObjects: startServices.savedObjects,
          executionContext: startServices.executionContext,
          security: { ...startServices.security, fips: core.security.fips },
          server: expect.objectContaining({ version: expect.any(String), isServerless: false }),
        })
      );
    });

    test('hands a module the capabilities it declares and no others', async () => {
      const { plugin, setup } = setupPlugin();
      const createTaskRunner = jest.fn().mockReturnValue({ run: async () => ({ state: {} }) });
      const eventLog = { registerProviderActions: jest.fn(), getLogger: jest.fn() };
      const unusedSettings = jest.fn().mockRejectedValue(new Error('Unrelated settings were read'));
      setup.registerTaskType(
        defineTaskType({
          type: 'test:capabilities',
          eventLog: { providers: [], create: jest.fn() },
          uiSettings: {},
          dataStreams: [],
          settings: ['alerting'],
          createTaskRunner,
        }),
        {
          hostExtensions: { eventLog },
          settings: { alerting: async () => ({ max: 1 }), unused: unusedSettings },
        }
      );
      const definitions = (
        plugin as unknown as {
          definitions: {
            get(type: string): { createTaskRunner(c: RunContext): { run(): Promise<unknown> } };
          };
        }
      ).definitions;
      await definitions
        .get('test:capabilities')!
        .createTaskRunner({} as RunContext)
        .run();

      const host = createTaskRunner.mock.calls[0][1];
      expect(host.eventLog).toBe(eventLog);
      expect(host.settings).toEqual({ alerting: { max: 1 } });
      expect(unusedSettings).not.toHaveBeenCalled();
      expect(host.uiSettings).toBeDefined();
      expect(host.dataStreams).toBeDefined();
      expect(host.encryptedSavedObjects).toBeUndefined();
      expect(host.taskManager).toBeUndefined();
    });

    test('throws when a declared capability has nothing to back it in Kibana', () => {
      const { setup } = setupPlugin();
      const createTaskRunner = jest.fn();
      expect(() =>
        setup.registerTaskType(
          defineTaskType({
            type: 'test:missing',
            eventLog: { providers: [], create: jest.fn() },
            encryptedSavedObjectTypes: [{ type: 'a', attributesToEncrypt: new Set(['b']) }],
            settings: ['alerting'],
            createTaskRunner,
          })
        )
      ).toThrow(
        /hostExtensions.encryptedSavedObjects, hostExtensions.getEncryptionKeys, hostExtensions.eventLog, settings.alerting/
      );
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
      mockSupervisor.serves.mockReset().mockReturnValue(true);
      mockSupervisor.getTaskTypes.mockReset().mockReturnValue([]);
      (existsSync as jest.Mock).mockReturnValue(true);
    });

    test('routes task types with a bundle to a task process by default (validation default: child_process)', () => {
      const { taskProcessDispatch } = create();
      expect(taskProcessDispatch).toBeDefined();
      expect(TaskProcessSupervisor).toHaveBeenCalled();
    });

    test('runs every task in this process when mode is explicitly in_process', () => {
      const { taskProcessDispatch } = create({ mode: 'in_process' });
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

    test('reads the live native execution pool for each worker coordination request', () => {
      const { taskProcessDispatch } = create({ mode: 'child_process' });
      mockTaskPollingLifecycle.getCurrentTasksInPool.mockReturnValueOnce(['first-task::run']);
      expect(taskProcessDispatch.getCurrentTasksInPool()).toEqual(['first-task::run']);
      mockTaskPollingLifecycle.getCurrentTasksInPool.mockReturnValueOnce(['later-task::run']);
      expect(taskProcessDispatch.getCurrentTasksInPool()).toEqual(['later-task::run']);
      expect(mockTaskPollingLifecycle.getCurrentTasksInPool).toHaveBeenCalledTimes(2);
    });

    test('evaluates the feature flags a module declares and the ones the registration adds, per dispatch', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        task_execution: { mode: 'remote', remote: { url: 'http://pod:4100' } },
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
      let added: Record<string, boolean> = { 'added.flag': false };
      setup.registerTaskType(
        defineTaskType({
          type: 'test:flags',
          featureFlags: { 'declared.flag': false },
          createTaskRunner: () => ({ run: async () => ({ state: {} }) }),
        }),
        { featureFlags: () => added }
      );
      const start = coreMock.createStart();
      const values: Record<string, boolean> = { 'declared.flag': true, 'added.flag': true };
      start.featureFlags.getBooleanValue$ = jest.fn((name: string, fallback: boolean) =>
        of(values[name] ?? fallback)
      ) as never;
      plugin.start(start, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });
      const { taskProcessDispatch } = (TaskPollingLifecycle as jest.Mock).mock.calls.at(-1)[0];

      await expect(taskProcessDispatch.getFeatureFlags('test:flags')).resolves.toEqual({
        'declared.flag': true,
        'added.flag': true,
      });
      // Read again for the next dispatch: what a plugin registered since is sent too.
      added = { 'added.flag': false, 'later.flag': false };
      values['later.flag'] = true;
      await expect(taskProcessDispatch.getFeatureFlags('test:flags')).resolves.toEqual({
        'declared.flag': true,
        'added.flag': true,
        'later.flag': true,
      });
      await expect(taskProcessDispatch.getFeatureFlags('test:unknown')).resolves.toBeUndefined();
      values['contributed.flag'] = true;
      await expect(
        taskProcessDispatch.getFeatureFlags('test:flags', { 'contributed.flag': false })
      ).resolves.toEqual({
        'declared.flag': true,
        'added.flag': true,
        'later.flag': true,
        'contributed.flag': true,
      });
      values['contributed.flag'] = false;
      await expect(
        taskProcessDispatch.getFeatureFlags('test:flags', { 'contributed.flag': false })
      ).resolves.toMatchObject({ 'contributed.flag': false });
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

    test('running from source with no task bundles built runs every module in this process and warns once', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        task_execution: { mode: 'child_process' },
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
      const logger = pluginInitializerContext.logger.get();
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

      expect(TaskProcessSupervisor).not.toHaveBeenCalled();
      expect(taskProcessDispatch.getRoute('test:module')).toBeUndefined();
      expect((logger.warn as jest.Mock).mock.calls.at(-1)[0]).toMatch(
        /No task bundle manifest.*running from source.*every task type runs in this process/
      );
    });

    test('a distributable still requires the manifest even with no bundle_dir override', () => {
      // `existsSync` is only consulted for the from-source skip; a distributable always creates
      // the supervisor, whose own `start()` throws when the manifest is missing.
      (existsSync as jest.Mock).mockReturnValue(false);
      mockSupervisor.start.mockImplementationOnce(() => {
        throw new Error('No task bundle manifest');
      });
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        task_execution: { mode: 'child_process' },
      } as TaskManagerConfig);
      (pluginInitializerContext.env.packageInfo as { dist: boolean }).dist = true;
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
      plugin.setup(core, { usageCollection: undefined });
      expect(() =>
        plugin.start(coreStart, {
          cloud: cloudMock.createStart(),
          licensing: licensingMock.createStart(),
        })
      ).toThrow();
    });
  });

  describe('what a task process is sent', () => {
    const setupWithModule = (
      startServices: Record<string, unknown>,
      settings: TaskTypeRegistrationOptions['settings'] = {
        connectors: () => ({ list: [{ id: 'dynamic', secrets: { token: 't' } }] }),
      },
      moduleOptions: Pick<TaskTypeModule, 'taskManager'> = {},
      configure?: (setup: TaskManagerSetupContract) => void
    ) => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        task_execution: { mode: 'child_process' },
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
      core.getStartServices.mockResolvedValue([
        { ...coreStart, ...startServices },
        {},
        {},
      ] as never);
      (core.http.basePath as { publicBaseUrl?: string }).publicBaseUrl = undefined;
      let connectorTypes = ['.email'];
      const plugin = new TaskManagerPlugin(pluginInitializerContext);
      const setup = plugin.setup(core, { usageCollection: undefined });
      setup.registerTaskType(
        defineTaskType({
          type: 'test:module',
          ...moduleOptions,
          createTaskRunner: () => ({ run: async () => ({ state: {} }) }),
        }),
        {
          settings,
          parity: { connectorTypes: () => connectorTypes },
        }
      );
      configure?.(setup);
      plugin.start(coreStart, {
        cloud: cloudMock.createStart(),
        licensing: licensingMock.createStart(),
      });
      const { getInitFor } = (TaskProcessSupervisor as unknown as jest.Mock).mock.calls.at(-1)[0]
        .settings;
      return { getInitFor, setup, setConnectorTypes: (ids: string[]) => (connectorTypes = ids) };
    };

    const uiSettingsStart = (
      overrides: Record<string, unknown>,
      globalOverrides: Record<string, unknown>
    ) => {
      const scoped = (values: Record<string, unknown>) => ({
        getUserProvided: jest.fn().mockResolvedValue({
          // Overrides, a null override, and a value a user saved that is not an override.
          ...Object.fromEntries(
            Object.entries(values).map(([key, value]) => [
              key,
              value === null ? { isOverridden: true } : { isOverridden: true, userValue: value },
            ])
          ),
          saved: { userValue: 'from the saved object' },
        }),
      });
      return {
        uiSettings: {
          asScopedToClient: jest.fn().mockReturnValue(scoped(overrides)),
          globalAsScopedToClient: jest.fn().mockReturnValue(scoped(globalOverrides)),
        },
      };
    };

    test('captures native middleware ids in Main registration order', async () => {
      const { getInitFor } = setupWithModule(
        uiSettingsStart({}, {}),
        {},
        { taskManager: true },
        (setup) => {
          setup.registerTaskProcessEncryptionKeys(() => ({ decryptionOnlyKeys: [] }));
          setup.addMiddleware(createInitialMiddleware(), { id: 'first' });
          setup.addMiddleware(createInitialMiddleware(), { id: 'second' });
        }
      );
      expect(
        (await getInitFor('test:module')).settings.taskManager.scheduling.middlewareIds
      ).toEqual(['first', 'second']);
    });

    test('refuses process scheduling with middleware that has no native registration id', async () => {
      const { getInitFor } = setupWithModule(
        uiSettingsStart({}, {}),
        {},
        { taskManager: true },
        (setup) => {
          setup.registerTaskProcessEncryptionKeys(() => ({ decryptionOnlyKeys: [] }));
          setup.addMiddleware(createInitialMiddleware());
        }
      );
      await expect(getInitFor('test:module')).rejects.toThrow(
        'middleware must declare native contribution ids'
      );
    });

    test('rejects duplicate and empty middleware ids during setup', () => {
      expect(() =>
        setupWithModule(uiSettingsStart({}, {}), {}, {}, (setup) => {
          setup.addMiddleware(createInitialMiddleware(), { id: 'same' });
          setup.addMiddleware(createInitialMiddleware(), { id: 'same' });
        })
      ).toThrow('already registered');
      expect(() =>
        setupWithModule(uiSettingsStart({}, {}), {}, {}, (setup) => {
          setup.addMiddleware(createInitialMiddleware(), { id: ' ' });
        })
      ).toThrow('nonempty id');
    });

    test('requires the owning encryption provider and captures rotated keys on every dispatch', async () => {
      const { setup, getInitFor } = setupWithModule(
        uiSettingsStart({}, {}),
        {},
        { taskManager: true }
      );
      await expect(getInitFor('test:module')).rejects.toThrow(
        'encryption settings have not been registered'
      );
      const keys = jest
        .fn()
        .mockReturnValue({ encryptionKey: 'a'.repeat(32), decryptionOnlyKeys: [] });
      setup.registerTaskProcessEncryptionKeys(keys);
      expect((await getInitFor('test:module')).encryptedSavedObjects).toEqual(keys());
      keys.mockReturnValue({ encryptionKey: 'b'.repeat(32), decryptionOnlyKeys: ['a'.repeat(32)] });
      expect((await getInitFor('test:module')).encryptedSavedObjects).toEqual(keys());
    });

    test("sends Kibana's ui settings overrides and what it registered, read for each run", async () => {
      const { getInitFor, setConnectorTypes } = setupWithModule(
        uiSettingsStart({ 'dateFormat:tz': 'UTC', removed: null }, { 'global:flag': true })
      );

      const first = await getInitFor('test:module');
      expect(first.uiSettingsOverrides).toEqual({ 'dateFormat:tz': 'UTC', removed: null });
      expect(first.uiSettingsGlobalOverrides).toEqual({ 'global:flag': true });
      expect(first.parity).toEqual([{ kind: 'connectorTypes', ids: ['.email'] }]);
      expect(first.settings.connectors).toEqual({
        list: [{ id: 'dynamic', secrets: { token: 't' } }],
      });

      // A connector type registered later is in the next run's parity.
      setConnectorTypes(['.email', '.later']);
      expect((await getInitFor('test:module')).parity).toEqual([
        { kind: 'connectorTypes', ids: ['.email', '.later'] },
      ]);
    });

    test('awaits file-backed settings and snapshots their current value on each dispatch', async () => {
      const pending = Promise.withResolvers<{ material: string }>();
      const getSettings = jest.fn().mockReturnValue(pending.promise);
      const { getInitFor } = setupWithModule(uiSettingsStart({}, {}), { material: getSettings });
      let ready = false;
      const first = getInitFor('test:module').then(
        (init: { settings: { material: { material: string } } }) => {
          ready = true;
          return init;
        }
      );
      await Promise.resolve();
      expect(ready).toBe(false);
      pending.resolve({ material: 'first' });
      expect((await first).settings.material).toEqual({ material: 'first' });
      getSettings.mockResolvedValue({ material: 'second' });
      expect((await getInitFor('test:module')).settings.material).toEqual({ material: 'second' });
      expect(getSettings).toHaveBeenCalledTimes(2);
    });

    test('rejects a failed settings read and retries the getter on the next dispatch', async () => {
      const error = new Error('Registry material could not be read');
      const getSettings = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ material: 'recovered' });
      const { getInitFor } = setupWithModule(uiSettingsStart({}, {}), { material: getSettings });
      await expect(getInitFor('test:module')).rejects.toBe(error);
      expect((await getInitFor('test:module')).settings.material).toEqual({
        material: 'recovered',
      });
      expect(getSettings).toHaveBeenCalledTimes(2);
    });

    test('sends the public base URL as Core has it: none when Kibana has none', async () => {
      const { getInitFor } = setupWithModule(uiSettingsStart({}, {}));
      const init = await getInitFor('test:module');
      expect(init.server.publicBaseUrl).toBeUndefined();
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
