/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerBatchRunner } from './batch_task_runner';
import type { CreateMemberRunnerFn, MemberRunnerOverrides } from './batch_task_runner';
import type { TaskRunner } from './task_runner';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import type { BatchRunResult, ConcreteTaskInstance, RunResult } from '../task';
import { TaskCost } from '../task';

function mockDoc(overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance {
  return {
    id: 'default-id',
    taskType: 'batchable',
    sequenceNumber: 32,
    primaryTerm: 32,
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: null,
    retryAt: null,
    attempts: 0,
    params: {},
    scope: ['reporting'],
    state: {},
    status: 'idle',
    ownerId: null,
    ...overrides,
  } as ConcreteTaskInstance;
}

interface MemberDouble {
  instance: ConcreteTaskInstance;
  overrides: MemberRunnerOverrides;
  markTaskAsRunning: jest.Mock;
  cancel: jest.Mock;
  removeTask: jest.Mock;
  run: jest.Mock;
  resolvedResults: RunResult[];
}

function buildMemberFactory() {
  const members: MemberDouble[] = [];
  const createMemberRunner: CreateMemberRunnerFn = (instance, overrides) => {
    const resolvedResults: RunResult[] = [];
    const member: MemberDouble = {
      instance,
      overrides,
      markTaskAsRunning: jest.fn(async () => true),
      cancel: jest.fn(async () => undefined),
      removeTask: jest.fn(async () => undefined),
      resolvedResults,
      run: jest.fn(async () => {
        // Mirrors what TaskManagerRunner.run() does: build the CancellableTask from the
        // override and invoke its run() to obtain the pre-computed result.
        const cancellableTask = overrides.createTaskRunnerOverride({
          taskInstance: instance,
          signal: new AbortController().signal,
          executionUuid: 'member-uuid',
          setCustomTaskRunEventFields: () => {},
        });
        const result = await cancellableTask.run();
        resolvedResults.push(result as RunResult);
        return result;
      }),
    };
    members.push(member);
    return member as unknown as TaskRunner;
  };
  return { createMemberRunner, members };
}

function buildDefinitions(defOverrides: Record<string, unknown> = {}) {
  const definitions = new TaskTypeDictionary(mockLogger());
  definitions.registerTaskDefinitions({
    batchable: {
      title: 'batchable',
      cost: TaskCost.Normal,
      batchSize: 3,
      createBatchTaskRunner: jest.fn(),
      ...defOverrides,
    },
  });
  return definitions;
}

describe('TaskManagerBatchRunner', () => {
  const logger = mockLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes batch-level metadata: taskType, definition, cost (one slot), id, taskExecutionId', () => {
    const definitions = buildDefinitions();
    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    expect(batch.taskType).toBe('batchable');
    expect(batch.definition?.type).toBe('batchable');
    expect(batch.cost).toBe(TaskCost.Normal);
    expect(batch.id).toMatch(/^batch:batchable:/);
    expect(batch.taskExecutionId).toContain(batch.id);
    expect(batch.isAdHocTaskAndOutOfAttempts).toBe(false);
  });

  it('isSameTask matches its own id and any member doc id', () => {
    const definitions = buildDefinitions();
    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    expect(batch.isSameTask('a::some-uuid')).toBe(true);
    expect(batch.isSameTask('b::some-uuid')).toBe(true);
    expect(batch.isSameTask('c::some-uuid')).toBe(false);
    expect(batch.isSameTask(`${batch.id}::whatever`)).toBe(true);
  });

  it('markTaskAsRunning delegates to all members and returns true only if all succeed', async () => {
    const definitions = buildDefinitions();
    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    await expect(batch.markTaskAsRunning()).resolves.toBe(true);
    expect(members).toHaveLength(2);
    for (const member of members) {
      expect(member.markTaskAsRunning).toHaveBeenCalledTimes(1);
    }

    members[1].markTaskAsRunning.mockResolvedValueOnce(false);
    await expect(batch.markTaskAsRunning()).resolves.toBe(false);
  });

  it('markTaskAsRunning returns false if a member throws', async () => {
    const definitions = buildDefinitions();
    const docs = [mockDoc({ id: 'a' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    members[0].markTaskAsRunning.mockRejectedValueOnce(new Error('boom'));
    await expect(batch.markTaskAsRunning()).resolves.toBe(false);
  });

  it('run() invokes createBatchTaskRunner once with all docs and feeds each member its own result', async () => {
    const resultsByTaskId: BatchRunResult = new Map([
      ['a', { state: { done: 'a' } }],
      ['b', { state: { done: 'b' } }],
    ]);
    const batchRun = jest.fn(async () => resultsByTaskId);
    const createBatchTaskRunner = jest.fn(() => ({ run: batchRun }));
    const definitions = buildDefinitions({ createBatchTaskRunner });

    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    await batch.markTaskAsRunning();
    await batch.run();

    expect(createBatchTaskRunner).toHaveBeenCalledTimes(1);
    expect(createBatchTaskRunner).toHaveBeenCalledWith(
      expect.objectContaining({ taskInstances: docs, executionUuid: expect.any(String) })
    );
    expect(batchRun).toHaveBeenCalledTimes(1);

    for (const member of members) {
      expect(member.run).toHaveBeenCalledTimes(1);
    }
    expect(members[0].resolvedResults[0]).toEqual({ state: { done: 'a' } });
    expect(members[1].resolvedResults[0]).toEqual({ state: { done: 'b' } });
  });

  it('run() synthesizes a failure result for a member missing from the batch result map', async () => {
    const resultsByTaskId: BatchRunResult = new Map([['a', { state: {} }]]);
    const createBatchTaskRunner = jest.fn(() => ({ run: async () => resultsByTaskId }));
    const definitions = buildDefinitions({ createBatchTaskRunner });

    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    await batch.run();

    expect(members[0].resolvedResults[0]).toEqual({ state: {} });
    const missingMemberResult = members[1].resolvedResults[0] as { error?: Error };
    expect(missingMemberResult.error).toBeInstanceOf(Error);
    expect(missingMemberResult.error?.message).toContain('did not return a result for task "b"');
  });

  it('run() fails every member when the batch task itself throws', async () => {
    const batchError = new Error('bulk call failed');
    const createBatchTaskRunner = jest.fn(() => ({
      run: async () => {
        throw batchError;
      },
    }));
    const definitions = buildDefinitions({ createBatchTaskRunner });

    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    await batch.run();

    for (const member of members) {
      const result = member.resolvedResults[0] as { error?: Error };
      expect(result.error).toBe(batchError);
    }
  });

  it('cancel() aborts the shared signal and cancels the batch task and all members', async () => {
    let capturedSignal: AbortSignal | undefined;
    const batchTaskCancel = jest.fn(async () => undefined);
    const createBatchTaskRunner = jest.fn(({ signal }: { signal: AbortSignal }) => {
      capturedSignal = signal;
      return { run: async () => new Map(), cancel: batchTaskCancel };
    });
    const definitions = buildDefinitions({ createBatchTaskRunner });

    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    // run() is what constructs the batch task and its abort controller
    await batch.run();
    await batch.cancel();

    expect(capturedSignal?.aborted).toBe(true);
    expect(batchTaskCancel).toHaveBeenCalledTimes(1);
    for (const member of members) {
      expect(member.cancel).toHaveBeenCalledTimes(1);
    }
  });

  it('removeTask() delegates to all members and calls the batch task cleanup hook', async () => {
    const cleanup = jest.fn(async () => undefined);
    const createBatchTaskRunner = jest.fn(() => ({ run: async () => new Map(), cleanup }));
    const definitions = buildDefinitions({ createBatchTaskRunner });

    const docs = [mockDoc({ id: 'a' }), mockDoc({ id: 'b' })];
    const { createMemberRunner, members } = buildMemberFactory();

    const batch = new TaskManagerBatchRunner({
      logger,
      definitions,
      taskType: 'batchable',
      docs,
      createMemberRunner,
    });

    await batch.run();
    await batch.removeTask();

    expect(cleanup).toHaveBeenCalledTimes(1);
    for (const member of members) {
      expect(member.removeTask).toHaveBeenCalledTimes(1);
    }
  });
});
