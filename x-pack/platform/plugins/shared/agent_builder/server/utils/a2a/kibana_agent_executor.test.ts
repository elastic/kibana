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
import { of, throwError, Subject } from 'rxjs';
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
    blocking: boolean = true,
    isStreaming: boolean = false,
    abortSignal?: AbortSignal
  ) => {
    const logger = { debug: jest.fn(), error: jest.fn() } as any;
    const kibanaRequest = { headers: {} } as unknown as KibanaRequest;
    const getInternalServices = () => ({ execution } as any);
    return new KibanaAgentExecutor({
      logger,
      getInternalServices,
      request: kibanaRequest,
      agentId: 'agent-1',
      blocking,
      isStreaming,
      abortSignal,
    });
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

  describe('streaming mode', () => {
    it('publishes an initial Task and forwards message chunks + round_complete as A2A events', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: of(
          {
            type: ChatEventType.messageChunk,
            data: { message_id: 'm-1', text_chunk: 'hel' },
          },
          {
            type: ChatEventType.messageChunk,
            data: { message_id: 'm-1', text_chunk: 'lo' },
          },
          {
            type: ChatEventType.messageComplete,
            data: { message_id: 'm-1', message_content: 'hello' },
          },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: 'hello' } } },
          }
        ) as any,
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);

      // Initial Task event — state 'working' since executeAgent has already been dispatched.
      expect(publishes[0]).toMatchObject({
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: expect.objectContaining({ state: 'working' }),
      });

      // First message_chunk → artifact-update, append=false
      expect(publishes[1]).toMatchObject({
        kind: 'artifact-update',
        taskId: 'task-1',
        contextId: 'ctx-1',
        append: false,
        lastChunk: false,
        artifact: expect.objectContaining({
          artifactId: 'm-1',
          parts: [{ kind: 'text', text: 'hel' }],
        }),
      });

      // Second message_chunk → append=true
      expect(publishes[2]).toMatchObject({
        kind: 'artifact-update',
        append: true,
        lastChunk: false,
        artifact: expect.objectContaining({
          artifactId: 'm-1',
          parts: [{ kind: 'text', text: 'lo' }],
        }),
      });

      // message_complete → append=true, lastChunk=true, empty parts (chunks already carried the content)
      expect(publishes[3]).toMatchObject({
        kind: 'artifact-update',
        append: true,
        lastChunk: true,
        artifact: expect.objectContaining({ artifactId: 'm-1', parts: [] }),
      });

      // round_complete → terminal status-update, final=true
      expect(publishes[4]).toMatchObject({
        kind: 'status-update',
        final: true,
        status: expect.objectContaining({ state: 'completed' }),
      });

      expect(eventBus.finished).toHaveBeenCalledTimes(1);
    });

    it('emits message_complete as a single artifact when no chunks were streamed', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: of(
          {
            type: ChatEventType.messageComplete,
            data: { message_id: 'm-1', message_content: 'full text' },
          },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: 'full text' } } },
          }
        ) as any,
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      // Task, artifact-update (single-shot), status-update completed
      expect(publishes).toHaveLength(3);
      expect(publishes[1]).toMatchObject({
        kind: 'artifact-update',
        append: false,
        lastChunk: true,
        artifact: expect.objectContaining({
          parts: [{ kind: 'text', text: 'full text' }],
        }),
      });
    });

    it('closes any open artifact before the terminal status when message_complete is missing', async () => {
      // Guards against upstream event-ordering changes: if chunks arrive but
      // message_complete never does, the artifact must still be closed with
      // lastChunk: true so conforming clients do not treat it as growing.
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: of(
          { type: ChatEventType.messageChunk, data: { message_id: 'm-1', text_chunk: 'hi' } },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: 'hi' } } },
          }
        ) as any,
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      // Task, artifact-update (chunk), defensive close, terminal status-update
      expect(publishes).toHaveLength(4);
      expect(publishes[2]).toMatchObject({
        kind: 'artifact-update',
        append: true,
        lastChunk: true,
        artifact: expect.objectContaining({ artifactId: 'm-1', parts: [] }),
      });
      expect(publishes[3]).toMatchObject({
        kind: 'status-update',
        final: true,
        status: expect.objectContaining({ state: 'completed' }),
      });
    });

    it('publishes a working status-update for tool_call, tool_progress, tool_result and reasoning', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: of(
          { type: ChatEventType.toolCall, data: { tool_id: 'search', tool_call_id: 't1' } },
          { type: ChatEventType.toolProgress, data: { tool_call_id: 't1', message: '50%' } },
          { type: ChatEventType.toolResult, data: { tool_id: 'search', tool_call_id: 't1' } },
          { type: ChatEventType.reasoning, data: { reasoning: 'thinking about it' } },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: '' } } },
          }
        ) as any,
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      const statusTexts = publishes
        .filter((e: any) => e.kind === 'status-update' && e.status?.message)
        .map((e: any) => e.status.message.parts[0].text);

      expect(statusTexts).toEqual(
        expect.arrayContaining([
          'Calling tool search...',
          '50%',
          'Tool search completed',
          'thinking about it',
        ])
      );
    });

    it('terminates the stream with input-required and text+data parts on prompt_request', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: of(
          {
            type: ChatEventType.promptRequest,
            data: {
              source: {},
              prompt: {
                type: 'confirmation',
                id: 'p-1',
                title: 'Continue?',
                message: 'Are you sure you want to proceed?',
                confirm_text: 'Yes',
                cancel_text: 'No',
              },
            },
          },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: '' } } },
          }
        ) as any,
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      const terminal = publishes.find(
        (e: any) => e.kind === 'status-update' && e.status?.state === 'input-required'
      );
      expect(terminal).toBeDefined();
      expect((terminal as any).final).toBe(true);
      const parts = (terminal as any).status.message.parts;
      expect(parts[0]).toMatchObject({ kind: 'text', text: 'Are you sure you want to proceed?' });
      expect(parts[1]).toMatchObject({
        kind: 'data',
        data: expect.objectContaining({
          type: 'confirmation',
          id: 'p-1',
          confirm_text: 'Yes',
          cancel_text: 'No',
        }),
      });
      // round_complete was NOT forwarded because the stream terminated on input-required
      expect(
        publishes.filter((e: any) => e.kind === 'status-update' && e.status?.state === 'completed')
      ).toHaveLength(0);
    });

    it('terminates the stream with a failed status-update on error', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({
        executionId: 'exec-1',
        events$: throwError(() => new Error('kaboom')),
      });

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      const terminal = publishes[publishes.length - 1] as any;
      expect(terminal.kind).toBe('status-update');
      expect(terminal.status.state).toBe('failed');
      expect(terminal.final).toBe(true);
      expect(terminal.status.message.parts[0].text).toContain('kaboom');
      expect(eventBus.finished).toHaveBeenCalledTimes(1);
    });

    it('opens the stream with a Task, then a failed status-update, when executeAgent itself throws', async () => {
      const execution = createExecutionMock();
      execution.executeAgent.mockRejectedValue(new Error('resolver blew up'));

      const executor = createExecutor(execution, true, true);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      const publishes = eventBus.publish.mock.calls.map(([e]) => e);
      // Initial Task frame must land before the terminal status-update, so
      // conforming clients see the taskId lifecycle open before it closes.
      expect(publishes[0]).toMatchObject({ kind: 'task', id: 'task-1', contextId: 'ctx-1' });
      expect(publishes[publishes.length - 1]).toMatchObject({
        kind: 'status-update',
        final: true,
        status: expect.objectContaining({ state: 'failed' }),
      });
      expect(eventBus.finished).toHaveBeenCalledTimes(1);
    });

    it('propagates abortSignal to executeAgent', async () => {
      const execution = createExecutionMock();
      const controller = new AbortController();
      const executor = createExecutor(execution, true, true, controller.signal);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({ abortSignal: controller.signal })
      );
    });

    it('finishes promptly when the abort signal fires mid-stream', async () => {
      const events$ = new Subject<any>();
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({ executionId: 'exec-1', events$ });

      const controller = new AbortController();
      const executor = createExecutor(execution, true, true, controller.signal);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      const done = executor.execute(requestContext, eventBus);

      // Push one intermediate frame, then abort. The source never completes.
      events$.next({
        type: ChatEventType.toolCall,
        data: { tool_id: 'search', tool_call_id: 't1' },
      });
      controller.abort();

      await done;

      expect(eventBus.finished).toHaveBeenCalledTimes(1);
    });

    it('finishes without publishing when the abort signal is already aborted at entry', async () => {
      const events$ = new Subject<any>();
      const execution = createExecutionMock();
      execution.executeAgent.mockResolvedValue({ executionId: 'exec-1', events$ });

      const controller = new AbortController();
      controller.abort();
      const executor = createExecutor(execution, true, true, controller.signal);
      const eventBus = createEventBusMock();
      const requestContext = new RequestContext(createUserMessage(), 'task-1', 'ctx-1');

      await executor.execute(requestContext, eventBus);

      // Initial Task was published, then aborted → finished. No source-derived frames.
      expect(eventBus.publish.mock.calls).toEqual([[expect.objectContaining({ kind: 'task' })]]);
      expect(eventBus.finished).toHaveBeenCalledTimes(1);
    });
  });
});
