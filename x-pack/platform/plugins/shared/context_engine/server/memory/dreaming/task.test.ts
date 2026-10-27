/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type {
  ConcreteTaskInstance,
  TaskDefinitionRegistry,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { MEMORY_DREAMING_TASK_TYPE } from '../../../common/memory';
import { countShortTermRevisions } from './read_window';
import { deleteLongTermMemories } from './rebuild';
import type { DreamTypeResult, RunDreamResult } from './run_dream';
import { runDream } from './run_dream';
import { MANUAL_DREAMING_RUN_AT } from './schedule';
import {
  CATCH_UP_DELAY_MS,
  registerMemoryDreamingTaskDefinition,
  resolveDreamConnectorId,
} from './task';
import type { MemoryDreamingTaskDeps } from './task';

jest.mock('./run_dream', () => ({ runDream: jest.fn() }));
jest.mock('./read_window', () => ({ countShortTermRevisions: jest.fn() }));
jest.mock('./rebuild', () => ({ deleteLongTermMemories: jest.fn() }));

const runDreamMock = jest.mocked(runDream);
const countMock = jest.mocked(countShortTermRevisions);
const deleteMock = jest.mocked(deleteLongTermMemories);
const fakeRequest = {} as KibanaRequest;

describe('resolveDreamConnectorId', () => {
  const inference = {
    getDefaultConnector: jest.fn().mockResolvedValue({ connectorId: 'default-connector' }),
  } as unknown as InferenceServerStart;

  const searchInferenceEndpoints = (connectorId?: string) =>
    ({
      endpoints: {
        getForFeature: jest
          .fn()
          .mockResolvedValue({ endpoints: connectorId ? [{ connectorId }] : [] }),
      },
    } as unknown as SearchInferenceEndpointsPluginStart);

  it('uses the connector set for the memory feature', async () => {
    const endpoints = searchInferenceEndpoints('feature-connector');

    await expect(
      resolveDreamConnectorId({
        request: fakeRequest,
        inference,
        searchInferenceEndpoints: endpoints,
      })
    ).resolves.toBe('feature-connector');
    expect(endpoints.endpoints.getForFeature).toHaveBeenCalledWith(
      'context_engine_memory',
      fakeRequest
    );
  });

  it('falls back to the default connector', async () => {
    await expect(
      resolveDreamConnectorId({
        request: fakeRequest,
        inference,
        searchInferenceEndpoints: searchInferenceEndpoints(),
      })
    ).resolves.toBe('default-connector');
    await expect(resolveDreamConnectorId({ request: fakeRequest, inference })).resolves.toBe(
      'default-connector'
    );
  });
});

describe('memory dreaming task', () => {
  let definitions: TaskDefinitionRegistry;
  let deps: MemoryDreamingTaskDeps;

  const run = async (
    taskInstance: Partial<ConcreteTaskInstance>,
    { withApiKey = true }: { withApiKey?: boolean } = {}
  ) => {
    const { createTaskRunner } = definitions[MEMORY_DREAMING_TASK_TYPE];
    const runner = createTaskRunner({
      taskInstance: {
        params: { spaceId: 'team-a' },
        state: {},
        schedule: { interval: '24h' },
        ...taskInstance,
      } as ConcreteTaskInstance,
      fakeRequest: withApiKey ? fakeRequest : undefined,
    } as Parameters<typeof createTaskRunner>[0]);
    return runner.run();
  };

  const typeResult = (overrides: Partial<DreamTypeResult> = {}): DreamTypeResult => ({
    memoriesRead: 3,
    applied: 2,
    skipped: 1,
    batches: 1,
    cursor: '2026-10-02T00:00:00.000Z',
    caughtUp: true,
    ...overrides,
  });

  const dreamResult = (
    types: Record<string, DreamTypeResult>,
    extra: Partial<RunDreamResult> = {}
  ): RunDreamResult => ({ types, caughtUp: true, ...extra });

  beforeEach(() => {
    runDreamMock.mockReset();
    runDreamMock.mockResolvedValue(dreamResult({ 'memory.fact': typeResult() }));
    countMock.mockReset();
    countMock.mockResolvedValue(42);
    deleteMock.mockReset();
    deleteMock.mockResolvedValue(7);
    deps = {
      esClient: {} as ElasticsearchClient,
      inference: {
        getClient: jest.fn().mockReturnValue({ output: jest.fn() }),
        getDefaultConnector: jest.fn().mockResolvedValue({ connectorId: 'default-connector' }),
      } as unknown as InferenceServerStart,
      isMemoryEnabled: jest.fn().mockResolvedValue(true),
      isContextEngineEnabled: jest.fn().mockResolvedValue(true),
      getInterval: jest.fn().mockResolvedValue('24h'),
    };
    const taskManager = {
      registerTaskDefinitions: jest.fn((registered: TaskDefinitionRegistry) => {
        definitions = registered;
      }),
    } as unknown as TaskManagerSetupContract;
    registerMemoryDreamingTaskDefinition({
      taskManager,
      getDeps: async () => deps,
      logger: loggerMock.create(),
    });
  });

  it('registers a single-attempt task', () => {
    expect(definitions[MEMORY_DREAMING_TASK_TYPE]).toMatchObject({
      timeout: '15m',
      maxAttempts: 1,
    });
  });

  it('dreams from each type cursor and records the cursors and the run counts', async () => {
    const cursors = { 'memory.fact': '2026-10-01T00:00:00.000Z' };

    const result = await run({ state: { lastDreamAt: '2026-10-01T00:00:00.000Z', cursors } });

    expect(runDreamMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'default-connector', spaceId: 'team-a', cursors })
    );
    expect(deps.inference.getClient).toHaveBeenCalledWith({ request: fakeRequest });
    expect(result).toEqual({
      state: {
        lastDreamAt: expect.any(String),
        lastRunAt: expect.any(String),
        lastRunStatus: 'success',
        lastRunMemoriesRead: 3,
        lastRunApplied: 2,
        lastRunSkipped: 1,
        cursors: { 'memory.fact': '2026-10-02T00:00:00.000Z' },
        lastRunTypes: {
          'memory.fact': { memoriesRead: 3, applied: 2, skipped: 1, batches: 1 },
        },
        catchingUp: false,
      },
    });
    expect(result?.state.lastDreamAt).toBe(result?.state.lastRunAt);
    expect(countMock).not.toHaveBeenCalled();
  });

  it('records a partial run when some types fail, keeping their cursors', async () => {
    runDreamMock.mockResolvedValue(
      dreamResult({
        'memory.fact': typeResult(),
        'memory.other': typeResult({
          memoriesRead: 0,
          applied: 0,
          skipped: 0,
          batches: 0,
          cursor: '2026-09-01T00:00:00.000Z',
          caughtUp: false,
          error: 'model unavailable',
        }),
      })
    );

    const { state } = (await run({})) as { state: Record<string, unknown> };

    expect(state).toMatchObject({
      lastRunStatus: 'partial',
      lastError: 'memory.other: model unavailable',
      lastRunApplied: 2,
      cursors: {
        'memory.fact': '2026-10-02T00:00:00.000Z',
        'memory.other': '2026-09-01T00:00:00.000Z',
      },
      lastRunTypes: { 'memory.other': expect.objectContaining({ error: 'model unavailable' }) },
    });
  });

  it('records a failed run when every type fails, without moving the last dream', async () => {
    runDreamMock.mockResolvedValue(
      dreamResult({
        'memory.fact': typeResult({
          batches: 0,
          caughtUp: false,
          cursor: '2026-10-01T00:00:00.000Z',
          error: 'model unavailable',
        }),
      })
    );

    const { state } = (await run({
      state: { lastDreamAt: '2026-09-30T00:00:00.000Z' },
    })) as { state: Record<string, unknown> };

    expect(state).toMatchObject({
      lastDreamAt: '2026-09-30T00:00:00.000Z',
      lastRunStatus: 'failed',
      catchingUp: false,
    });
    expect(state).not.toHaveProperty('lastRunApplied');
  });

  it('runs again within a minute while catching up, and counts what is left', async () => {
    runDreamMock.mockResolvedValue(
      dreamResult(
        { 'memory.fact': typeResult({ caughtUp: false }) },
        { caughtUp: false, behindFrom: '2026-10-02T00:00:00.000Z' }
      )
    );
    const before = Date.now();

    const result = await run({ params: { spaceId: 'team-a', scheduled: false } });

    expect(result).toMatchObject({ state: { catchingUp: true, pendingMemories: 42 } });
    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'team-a', from: '2026-10-02T00:00:00.000Z' })
    );
    const runAt = (result as { runAt: Date }).runAt.getTime();
    expect(runAt).toBeGreaterThanOrEqual(before + CATCH_UP_DELAY_MS);
    expect(runAt).toBeLessThan(MANUAL_DREAMING_RUN_AT.getTime());
  });

  it('still catches up when counting what is left fails', async () => {
    runDreamMock.mockResolvedValue(
      dreamResult(
        { 'memory.fact': typeResult({ caughtUp: false }) },
        { caughtUp: false, behindFrom: '2026-10-02T00:00:00.000Z' }
      )
    );
    countMock.mockRejectedValue(new Error('count failed'));

    const result = await run({});

    expect(result).toMatchObject({ state: { catchingUp: true }, runAt: expect.any(Date) });
    expect(result?.state).not.toHaveProperty('pendingMemories');
  });

  it.each([
    ['memory is disabled', 'isMemoryEnabled'],
    ['Context Engine is disabled in the space', 'isContextEngineEnabled'],
  ] as const)('does nothing while %s', async (_name, check) => {
    deps[check] = jest.fn().mockResolvedValue(false);
    const state = { lastDreamAt: '2026-10-01T00:00:00.000Z' };

    await expect(run({ state })).resolves.toEqual({ state });
    expect(runDreamMock).not.toHaveBeenCalled();
  });

  it('records a failure that keeps the cursors and clears the previous counts', async () => {
    runDreamMock.mockRejectedValue(new Error('cluster down'));
    const state = {
      lastDreamAt: '2026-10-01T00:00:00.000Z',
      lastRunStatus: 'success',
      lastRunMemoriesRead: 3,
      lastRunApplied: 2,
      lastRunSkipped: 1,
      cursors: { 'memory.fact': '2026-10-01T00:00:00.000Z' },
    };

    await expect(run({ state })).resolves.toEqual({
      state: {
        lastDreamAt: '2026-10-01T00:00:00.000Z',
        lastRunAt: expect.any(String),
        lastRunStatus: 'failed',
        lastError: 'cluster down',
        cursors: { 'memory.fact': '2026-10-01T00:00:00.000Z' },
      },
    });
  });

  it('fails with a hint when the task has no API key', async () => {
    const result = await run({}, { withApiKey: false });

    expect(result?.state).toMatchObject({
      lastRunStatus: 'failed',
      lastError: expect.stringContaining('Turn dreaming off and on again'),
    });
    expect(runDreamMock).not.toHaveBeenCalled();
  });

  it('moves the task to a changed interval setting', async () => {
    deps.getInterval = jest.fn().mockResolvedValue('6h');

    const result = await run({});

    expect(result).toMatchObject({ schedule: { interval: '6h' } });
  });

  it('parks a manual-only task again after each run', async () => {
    const params = { spaceId: 'team-a', scheduled: false };

    await expect(run({ params })).resolves.toMatchObject({ runAt: MANUAL_DREAMING_RUN_AT });

    runDreamMock.mockRejectedValue(new Error('model unavailable'));
    await expect(run({ params })).resolves.toMatchObject({ runAt: MANUAL_DREAMING_RUN_AT });
  });

  it('leaves the run time of a scheduled task to Task Manager', async () => {
    const result = await run({});

    expect(result).not.toHaveProperty('runAt');
  });

  describe('rebuild', () => {
    const params = { spaceId: 'team-a', rebuild: true };
    const cursors = { 'memory.fact': '2026-10-01T00:00:00.000Z' };

    it('deletes the long-term memories and reads every short-term memory', async () => {
      await run({ params, state: { cursors } });

      expect(deleteMock).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'team-a' }));
      expect(runDreamMock).toHaveBeenCalledWith(expect.objectContaining({ cursors: undefined }));
      expect(deleteMock.mock.invocationCallOrder[0]).toBeLessThan(
        runDreamMock.mock.invocationCallOrder[0]
      );
    });

    it('carries on from the cursors while catching up on a rebuild', async () => {
      await run({ params, state: { cursors, catchingUp: true } });

      expect(deleteMock).not.toHaveBeenCalled();
      expect(runDreamMock).toHaveBeenCalledWith(expect.objectContaining({ cursors }));
    });

    it('drops the cursors when the dream fails after the delete', async () => {
      runDreamMock.mockRejectedValue(new Error('model unavailable'));

      const result = await run({ params, state: { cursors } });

      expect(result?.state).toMatchObject({ lastRunStatus: 'failed' });
      expect(result?.state).not.toHaveProperty('cursors');
    });

    it('drops the cursors when the delete fails part way', async () => {
      deleteMock.mockRejectedValue(new Error('cluster down'));

      const result = await run({ params, state: { cursors } });

      expect(result?.state).toMatchObject({ lastRunStatus: 'failed' });
      expect(result?.state).not.toHaveProperty('cursors');
      expect(runDreamMock).not.toHaveBeenCalled();
    });

    it('does not delete anything when rebuild is off', async () => {
      await run({ state: { cursors } });

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});
