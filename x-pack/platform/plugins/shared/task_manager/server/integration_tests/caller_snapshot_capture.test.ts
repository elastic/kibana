/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration test: captureCaller → SO persistence → adoptPersistedCaller → replayCaller → fakeRequest
 *
 * Uses mocked Core/Security and a real `TaskScheduling` + `TaskManagerRunner` to exercise
 * the full schedule → persist → run flow with CallerSnapshot, without booting a full Kibana.
 *
 * Asserts the documented happy path:
 * 1. `schedule({ request })` calls `captureCaller` and stamps `callerSnapshot` on the persisted task.
 * 2. `TaskManagerRunner.run()` calls `adoptPersistedCaller` then `replayCaller`, and the
 *    resulting `fakeRequest` is passed to the task definition's `createTaskRunner`.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CallerSnapshot, CoreAuthenticationService } from '@kbn/core-security-server';
import type { ConcreteTaskInstance, TaskEventLogger } from '../task';
import { TaskStatus } from '../task';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskScheduling } from '../task_scheduling';
import { TaskManagerRunner } from '../task_running/task_runner';
import { createInitialMiddleware } from '../lib/middleware';
import { EsApiKeyStrategy } from '../api_key_strategy';
import { mockLogger } from '../test_utils';
import { configMock } from '../config.mock';
import { CLAIM_STRATEGY_UPDATE_BY_QUERY } from '../config';
import { executionContextServiceMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { bufferedTaskStoreMock } from '../buffered_task_store.mock';
import { taskStoreMock } from '../task_store.mock';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

jest.mock('uuid', () => ({ v4: () => 'integration-test-uuid' }));
jest.mock('elastic-apm-node', () => ({
  currentTraceparent: null,
  currentTransaction: null,
  startTransaction: jest
    .fn()
    .mockReturnValue({ end: jest.fn(), addLabels: jest.fn(), setLabel: jest.fn() }),
  startSpan: jest.fn().mockReturnValue({ end: jest.fn() }),
  addLabels: jest.fn(),
  setLabel: jest.fn(),
  addFilter: jest.fn(),
  captureError: jest.fn(),
  isStarted: jest.fn().mockReturnValue(false),
}));

const eventLoggerMock = { logEvent: jest.fn() } as unknown as TaskEventLogger;
const executionContext = executionContextServiceMock.createSetupContract();

/**
 * Build a minimal `CallerSnapshot` brand-compatible object for tests.
 * In production only Core/Security can produce these via `stampCaller` /
 * `captureCaller` / `adoptPersistedCaller`.
 */
const makeSnapshot = (overrides: Partial<CallerSnapshot> = {}): CallerSnapshot =>
  ({
    v: 1,
    authorization: 'ApiKey integration-test-key',
    spaceId: 'default',
    userProfileId: 'u_integration_test_profile',
    ...overrides,
  } as unknown as CallerSnapshot);

const buildCoreAuthcMock = ({
  captureResult,
  replayResult,
}: {
  captureResult: CallerSnapshot | undefined;
  replayResult: KibanaRequest | undefined;
}): jest.Mocked<CoreAuthenticationService> =>
  ({
    getCurrentUser: jest.fn(),
    getRedactedSessionId: jest.fn(),
    captureCaller: jest.fn().mockResolvedValue(captureResult),
    replayCaller: jest.fn().mockReturnValue(replayResult),
    stampCaller: jest.fn(),
    adoptPersistedCaller: jest.fn().mockImplementation((persisted: unknown) => {
      // mirror real implementation: return the value if it has a numeric `v`
      if (persisted && typeof (persisted as Record<string, unknown>).v === 'number') {
        return persisted as CallerSnapshot;
      }
      return undefined;
    }),
    apiKeys: {} as never,
  } as unknown as jest.Mocked<CoreAuthenticationService>);

describe('CallerSnapshot end-to-end: schedule → persist → adoptPersistedCaller → replayCaller', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  describe('schedule() stamps callerSnapshot when Core/Security is available', () => {
    it('stamps callerSnapshot on the persisted task when captureCaller returns a snapshot', async () => {
      const snapshot = makeSnapshot();
      const fakeRequest = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey integration-test-key' },
      });
      const coreAuthc = buildCoreAuthcMock({ captureResult: snapshot, replayResult: fakeRequest });

      const mockStore = taskStoreMock.create({});
      mockStore.schedule.mockResolvedValueOnce({
        id: 'task-1',
        taskType: 'callerSnapshotTestTask',
        params: {},
        state: {},
        status: TaskStatus.Idle,
        attempts: 0,
        scheduledAt: new Date(),
        startedAt: null,
        retryAt: null,
        runAt: new Date(),
        ownerId: null,
        traceparent: '',
        callerSnapshot: snapshot,
      } as unknown as ConcreteTaskInstance);

      const taskScheduling = new TaskScheduling({
        logger: mockLogger(),
        taskStore: mockStore,
        middleware: createInitialMiddleware(),
        taskManagerId: 'test-node',
        getCoreAuthc: () => coreAuthc,
      });

      const schedulingRequest = httpServerMock.createKibanaRequest();
      await taskScheduling.schedule(
        { taskType: 'callerSnapshotTestTask', params: {}, state: {} },
        { request: schedulingRequest }
      );

      expect(coreAuthc.captureCaller).toHaveBeenCalledWith(schedulingRequest);

      const [persistedTask] = mockStore.schedule.mock.calls[0];
      expect(persistedTask.callerSnapshot).toEqual(snapshot);
      expect(persistedTask.callerSnapshot?.v).toBe(1);
      expect(persistedTask.callerSnapshot?.authorization).toBe('ApiKey integration-test-key');
      expect(persistedTask.callerSnapshot?.userProfileId).toBe('u_integration_test_profile');
    });

    it('does not stamp callerSnapshot when no request is provided', async () => {
      const snapshot = makeSnapshot();
      const coreAuthc = buildCoreAuthcMock({
        captureResult: snapshot,
        replayResult: undefined,
      });

      const mockStore = taskStoreMock.create({});
      mockStore.schedule.mockResolvedValueOnce({
        id: 'task-2',
        taskType: 'callerSnapshotTestTask',
        params: {},
        state: {},
        status: TaskStatus.Idle,
        attempts: 0,
        scheduledAt: new Date(),
        startedAt: null,
        retryAt: null,
        runAt: new Date(),
        ownerId: null,
        traceparent: '',
      } as unknown as ConcreteTaskInstance);

      const taskScheduling = new TaskScheduling({
        logger: mockLogger(),
        taskStore: mockStore,
        middleware: createInitialMiddleware(),
        taskManagerId: 'test-node',
        getCoreAuthc: () => coreAuthc,
      });

      await taskScheduling.schedule({ taskType: 'callerSnapshotTestTask', params: {}, state: {} });

      expect(coreAuthc.captureCaller).not.toHaveBeenCalled();
      const [persistedTask] = mockStore.schedule.mock.calls[0];
      expect(persistedTask.callerSnapshot).toBeUndefined();
    });
  });

  describe('TaskManagerRunner goes through adoptPersistedCaller → replayCaller at run time', () => {
    const buildRunner = (
      taskOverrides: Partial<ConcreteTaskInstance>,
      coreAuthc: jest.Mocked<CoreAuthenticationService> | undefined,
      onCreateTaskRunner: (opts: { fakeRequest: KibanaRequest | undefined }) => void
    ) => {
      const logger: Logger = mockLogger();
      const instance: ConcreteTaskInstance = {
        id: 'runner-task-1',
        taskType: 'callerSnapshotRunnerTask',
        sequenceNumber: 1,
        primaryTerm: 1,
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: null,
        attempts: 0,
        params: {},
        state: {},
        status: TaskStatus.Idle,
        ownerId: null,
        traceparent: '',
        ...taskOverrides,
      } as ConcreteTaskInstance;

      const store = bufferedTaskStoreMock.create();
      store.update.mockResolvedValue(instance);
      store.partialUpdate.mockResolvedValue(instance);

      const definitions = new TaskTypeDictionary(logger);
      definitions.registerTaskDefinitions({
        callerSnapshotRunnerTask: {
          title: 'CallerSnapshot runner task',
          createTaskRunner: (opts) => {
            onCreateTaskRunner({ fakeRequest: opts.fakeRequest });
            return { run: async () => ({ state: {} }) };
          },
        },
      });

      return new TaskManagerRunner({
        defaultMaxAttempts: 5,
        beforeRun: (ctx) => Promise.resolve(ctx),
        beforeMarkRunning: (ctx) => Promise.resolve(ctx),
        logger,
        store,
        instance,
        definitions,
        executionContext,
        usageCounter: usageCountersServiceMock.createSetupContract().createUsageCounter('test'),
        config: configMock.create(),
        allowReadingInvalidState: false,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        getPollInterval: () => 500,
        apiKeyStrategy: new EsApiKeyStrategy(),
        eventLogger: eventLoggerMock,
        ...(coreAuthc
          ? { getCoreAuthc: () => coreAuthc as unknown as CoreAuthenticationService }
          : {}),
      });
    };

    it('passes replayCaller result as fakeRequest when callerSnapshot is present', async () => {
      const snapshot = makeSnapshot();
      const fakeReq = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey integration-test-key' },
      });
      const coreAuthc = buildCoreAuthcMock({ captureResult: snapshot, replayResult: fakeReq });

      let receivedFakeRequest: KibanaRequest | undefined;
      const runner = buildRunner({ callerSnapshot: snapshot }, coreAuthc, ({ fakeRequest }) => {
        receivedFakeRequest = fakeRequest;
      });

      await runner.markTaskAsRunning();
      await runner.run();

      expect(coreAuthc.adoptPersistedCaller).toHaveBeenCalledWith(snapshot);
      expect(coreAuthc.replayCaller).toHaveBeenCalledWith(snapshot);
      expect(receivedFakeRequest).toBe(fakeReq);
    });

    it('falls back to legacy path when callerSnapshot is absent', async () => {
      const coreAuthc = buildCoreAuthcMock({ captureResult: undefined, replayResult: undefined });

      let receivedFakeRequest: KibanaRequest | undefined;
      const runner = buildRunner({ callerSnapshot: undefined }, coreAuthc, ({ fakeRequest }) => {
        receivedFakeRequest = fakeRequest;
      });

      await runner.markTaskAsRunning();
      await runner.run();

      expect(coreAuthc.adoptPersistedCaller).toHaveBeenCalledWith(undefined);
      expect(coreAuthc.replayCaller).not.toHaveBeenCalled();
      // Task has no apiKey → legacy path also returns undefined; the key assertion is
      // that `replayCaller` was NOT invoked (which we already confirmed above).
      expect(receivedFakeRequest).toBeUndefined();
    });

    it('falls back to legacy path when adoptPersistedCaller returns undefined', async () => {
      const snapshot = makeSnapshot();
      const coreAuthcCorrupt = {
        ...buildCoreAuthcMock({ captureResult: snapshot, replayResult: undefined }),
        adoptPersistedCaller: jest.fn().mockReturnValue(undefined),
      } as unknown as jest.Mocked<CoreAuthenticationService>;

      let receivedFakeRequest: KibanaRequest | undefined;
      const runner = buildRunner(
        { callerSnapshot: snapshot },
        coreAuthcCorrupt,
        ({ fakeRequest }) => {
          receivedFakeRequest = fakeRequest;
        }
      );

      await runner.markTaskAsRunning();
      await runner.run();

      expect(coreAuthcCorrupt.adoptPersistedCaller).toHaveBeenCalledWith(snapshot);
      expect(coreAuthcCorrupt.replayCaller).not.toHaveBeenCalled();
      // Task has no apiKey → legacy path also returns undefined; key assertion is that
      // `replayCaller` was NOT called (already confirmed above).
      expect(receivedFakeRequest).toBeUndefined();
    });

    it('confirms fakeRequest carries expected authorization header from snapshot', async () => {
      const snapshot = makeSnapshot({ authorization: 'ApiKey expected-key-value' });
      const fakeReq = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey expected-key-value' },
      });
      const coreAuthc = buildCoreAuthcMock({ captureResult: snapshot, replayResult: fakeReq });

      let receivedFakeRequest: KibanaRequest | undefined;
      const runner = buildRunner({ callerSnapshot: snapshot }, coreAuthc, ({ fakeRequest }) => {
        receivedFakeRequest = fakeRequest;
      });

      await runner.markTaskAsRunning();
      await runner.run();

      expect(receivedFakeRequest?.headers.authorization).toBe('ApiKey expected-key-value');
    });
  });
});
