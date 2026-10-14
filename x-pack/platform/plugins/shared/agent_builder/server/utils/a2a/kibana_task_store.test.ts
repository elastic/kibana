/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode, ChatEventType, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import { KibanaTaskStore } from './kibana_task_store';

describe('KibanaTaskStore', () => {
  const createExecution = (overrides: Partial<AgentExecution> = {}): AgentExecution =>
    ({
      executionId: 'exec-1',
      '@timestamp': '2026-01-01T00:00:00.000Z',
      status: ExecutionStatus.running,
      agentId: 'agent-1',
      spaceId: 'default',
      eventCount: 0,
      events: [],
      executionMode: AgentExecutionMode.conversation,
      agentParams: { nextInput: { message: 'hello' } },
      ...overrides,
    } as AgentExecution);

  const createStore = (
    getExecution: jest.Mock,
    { currentSpaceId = 'default' }: { currentSpaceId?: string } = {}
  ) => {
    const getInternalServices = () =>
      ({
        execution: { getExecution },
        spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue(currentSpaceId) } },
      } as any);
    const kibanaRequest = {} as any;
    return new KibanaTaskStore(getInternalServices, kibanaRequest);
  };

  it('returns undefined when the execution is not found', async () => {
    const getExecution = jest.fn().mockResolvedValue(undefined);
    const store = createStore(getExecution);

    const task = await store.load('missing-id');

    expect(task).toBeUndefined();
    expect(getExecution).toHaveBeenCalledWith('missing-id');
  });

  it.each([
    [ExecutionStatus.scheduled, 'submitted'],
    [ExecutionStatus.running, 'working'],
    [ExecutionStatus.failed, 'failed'],
    [ExecutionStatus.aborted, 'canceled'],
  ] as const)('maps execution status %s to task state %s', async (status, expectedState) => {
    const getExecution = jest.fn().mockResolvedValue(createExecution({ status }));
    const store = createStore(getExecution);

    const task = await store.load('exec-1');

    expect(task).toEqual(
      expect.objectContaining({
        id: 'exec-1',
        contextId: 'exec-1',
        kind: 'task',
        status: expect.objectContaining({ state: expectedState }),
      })
    );
  });

  it('returns undefined when the execution belongs to a different space', async () => {
    const getExecution = jest.fn().mockResolvedValue(createExecution({ spaceId: 'other-space' }));
    const store = createStore(getExecution, { currentSpaceId: 'default' });

    const task = await store.load('exec-1');

    expect(task).toBeUndefined();
  });

  it('uses the persisted a2aContextId as contextId when present', async () => {
    const getExecution = jest
      .fn()
      .mockResolvedValue(createExecution({ metadata: { a2aContextId: 'ctx-1' } }));
    const store = createStore(getExecution);

    const task = await store.load('exec-1');

    expect(task).toEqual(expect.objectContaining({ contextId: 'ctx-1' }));
  });

  it('includes the final response message when completed', async () => {
    const getExecution = jest.fn().mockResolvedValue(
      createExecution({
        status: ExecutionStatus.completed,
        events: [
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: 'hi there' } } },
          } as any,
        ],
      })
    );
    const store = createStore(getExecution);

    const task = await store.load('exec-1');

    expect(task?.status.message).toEqual(
      expect.objectContaining({
        kind: 'message',
        role: 'agent',
        parts: [{ kind: 'text', text: 'hi there' }],
        taskId: 'exec-1',
        contextId: 'exec-1',
      })
    );
  });

  it('is a no-op on save, since the execution document is the source of truth', async () => {
    const store = createStore(jest.fn());
    await expect(
      store.save({ id: 'exec-1', contextId: 'exec-1', kind: 'task', status: { state: 'working' } })
    ).resolves.toBeUndefined();
  });
});
