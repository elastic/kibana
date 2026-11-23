/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { RequestContext } from '@a2a-js/sdk/server';
import type { ExecutionEventBus } from '@a2a-js/sdk/server';
import type { Message } from '@a2a-js/sdk';
import { of } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import { KibanaAgentExecutor } from './kibana_agent_executor';

describe('KibanaAgentExecutor', () => {
  const createEventBusMock = (): jest.Mocked<ExecutionEventBus> =>
    ({
      publish: jest.fn(),
      finished: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
    } as unknown as jest.Mocked<ExecutionEventBus>);

  const createUserMessage = (): Message => ({
    kind: 'message',
    role: 'user',
    messageId: 'msg-1',
    parts: [{ kind: 'text', text: 'hello' }],
  });

  const roundCompleteEvents$ = of({
    type: ChatEventType.roundComplete,
    data: { round: { id: 'r-1', response: { message: 'hi there' } } },
  } as any);

  const createExecutionMock = () => ({
    executeAgent: jest
      .fn()
      .mockResolvedValue({ executionId: 'exec-1', events$: roundCompleteEvents$ }),
  });

  const createExecutor = (
    execution: ReturnType<typeof createExecutionMock>,
    blocking: boolean = true
  ) => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const kibanaRequest = { headers: {} } as unknown as KibanaRequest;
    const getInternalServices = () => ({ execution } as any);
    return new KibanaAgentExecutor(logger, getInternalServices, kibanaRequest, 'agent-1', blocking);
  };

  it('disables task manager scheduling for blocking (default) requests', async () => {
    const execution = createExecutionMock();
    const executor = createExecutor(execution);
    const eventBus = createEventBusMock();
    const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

    await executor.execute(requestContext, eventBus);

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ useTaskManager: false })
    );
  });

  it('persists the A2A contextId as execution metadata, for both blocking and non-blocking requests', async () => {
    const execution = createExecutionMock();
    const executor = createExecutor(execution);
    const eventBus = createEventBusMock();
    const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

    await executor.execute(requestContext, eventBus);

    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { a2aContextId: 'ctx-1' } })
    );
  });

  it('schedules on task manager and publishes a working task for non-blocking requests, without awaiting completion', async () => {
    const execution = createExecutionMock();
    const executor = createExecutor(execution, false);
    const eventBus = createEventBusMock();
    const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

    await executor.execute(requestContext, eventBus);

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ useTaskManager: true, executionId: 'task-1' })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        contextId: 'ctx-1',
        kind: 'task',
        status: expect.objectContaining({ state: 'working' }),
      })
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.finished).toHaveBeenCalledTimes(1);
  });

  it('publishes the round response text and finishes the event bus', async () => {
    const execution = createExecutionMock();
    const executor = createExecutor(execution);
    const eventBus = createEventBusMock();
    const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

    await executor.execute(requestContext, eventBus);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'message',
        role: 'agent',
        taskId: 'task-1',
        contextId: 'ctx-1',
        parts: [{ kind: 'text', text: 'hi there' }],
      })
    );
    expect(eventBus.finished).toHaveBeenCalledTimes(1);
  });

  it('sends an error response when no round_complete event is emitted', async () => {
    const execution = createExecutionMock();
    execution.executeAgent.mockResolvedValue({ executionId: 'exec-1', events$: of() });
    const executor = createExecutor(execution);
    const eventBus = createEventBusMock();
    const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

    await executor.execute(requestContext, eventBus);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [
          { kind: 'text', text: 'Error: No complete response received from execution service' },
        ],
      })
    );
    expect(eventBus.finished).toHaveBeenCalledTimes(1);
  });
});
