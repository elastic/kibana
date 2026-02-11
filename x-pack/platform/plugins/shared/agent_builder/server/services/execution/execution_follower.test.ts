/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  AgentBuilderErrorCode,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecutionClient, ExecutionEventsClient } from './persistence';
import type { AgentExecution, AgentExecutionEventDoc } from './types';
import { ExecutionStatus } from './types';
import { followExecution$ } from './execution_follower';
import * as constants from './constants';

const EXECUTION_ID = 'exec-1';

const createMockClients = () => ({
  eventsClient: {
    writeEvents: jest.fn(),
    readEvents: jest.fn(),
  } as jest.Mocked<ExecutionEventsClient>,
  executionClient: {
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
  } as jest.Mocked<AgentExecutionClient>,
});

const createExecution = (overrides: Partial<AgentExecution> = {}): AgentExecution => ({
  executionId: EXECUTION_ID,
  '@timestamp': new Date().toISOString(),
  status: ExecutionStatus.running,
  agentId: 'agent-1',
  spaceId: 'default',
  agentParams: { nextInput: { message: 'hello' } },
  ...overrides,
});

const createEventDoc = (eventNumber: number, event: ChatEvent): AgentExecutionEventDoc => ({
  '@timestamp': Date.now(),
  agentExecutionId: EXECUTION_ID,
  eventNumber,
  agentId: 'agent-1',
  spaceId: 'default',
  event,
});

const messageChunkEvent = (text: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: text },
  } as ChatEvent);

const roundCompleteEvent = (): ChatEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: { round: { id: 'round-1' } },
  } as unknown as ChatEvent);

/**
 * Collect all events emitted by the observable.
 * Also captures the error if the observable errors out.
 */
const collectEvents = (
  obs: ReturnType<typeof followExecution$>
): Promise<{ events: ChatEvent[]; error?: Error }> => {
  return new Promise((resolve) => {
    const events: ChatEvent[] = [];
    obs.subscribe({
      next: (event) => events.push(event),
      error: (err) => resolve({ events, error: err }),
      complete: () => resolve({ events }),
    });
  });
};

describe('followExecution$', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('emits events and completes when execution is immediately completed with roundComplete', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    eventsClient.readEvents.mockResolvedValueOnce([
      createEventDoc(1, chunk),
      createEventDoc(2, complete),
    ]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({ status: ExecutionStatus.completed })
    );

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
  });

  it('polls multiple times before terminal status', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const chunk1 = messageChunkEvent('a');
    const chunk2 = messageChunkEvent('b');
    const complete = roundCompleteEvent();

    // Poll 1: one event, still running
    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(1, chunk1)]);
    executionClient.get.mockResolvedValueOnce(createExecution({ status: ExecutionStatus.running }));

    // Poll 2: more events, completed
    eventsClient.readEvents.mockResolvedValueOnce([
      createEventDoc(2, chunk2),
      createEventDoc(3, complete),
    ]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({ status: ExecutionStatus.completed })
    );

    const promise = collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    // Advance past the poll interval to trigger second poll
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_POLL_INTERVAL_MS);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk1, chunk2, complete]);
    expect(eventsClient.readEvents).toHaveBeenCalledTimes(2);
  });

  it('drains remaining events when roundComplete is not in the initial batch', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    // Poll 1: one event, completed status but no roundComplete yet
    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(1, chunk)]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({ status: ExecutionStatus.completed })
    );

    // Drain retry 1: roundComplete arrives
    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(2, complete)]);

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
    // Initial read + 1 drain retry
    expect(eventsClient.readEvents).toHaveBeenCalledTimes(2);
  });

  it('drains with retries and delay when events are not immediately available', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    // Poll 1: one event, completed status but no roundComplete
    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(1, chunk)]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({ status: ExecutionStatus.completed })
    );

    // Drain retry 1: nothing yet
    eventsClient.readEvents.mockResolvedValueOnce([]);
    // Drain retry 2: roundComplete arrives
    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(2, complete)]);

    const promise = collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    // Advance past the drain retry delay
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_TERMINAL_READ_RETRY_DELAY_MS);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
    // Initial read + 2 drain retries
    expect(eventsClient.readEvents).toHaveBeenCalledTimes(3);
  });

  it('errors with structured error on failed execution with error details', async () => {
    const { eventsClient, executionClient } = createMockClients();

    eventsClient.readEvents.mockResolvedValueOnce([]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({
        status: ExecutionStatus.failed,
        error: {
          code: AgentBuilderErrorCode.agentExecutionError,
          message: 'something went wrong',
        },
      })
    );

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toBe('something went wrong');
  });

  it('errors with internal error on failed execution without error details', async () => {
    const { eventsClient, executionClient } = createMockClients();

    eventsClient.readEvents.mockResolvedValueOnce([]);
    executionClient.get.mockResolvedValueOnce(createExecution({ status: ExecutionStatus.failed }));

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('failed');
  });

  it('errors on aborted execution', async () => {
    const { eventsClient, executionClient } = createMockClients();

    eventsClient.readEvents.mockResolvedValueOnce([]);
    executionClient.get.mockResolvedValueOnce(createExecution({ status: ExecutionStatus.aborted }));

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('aborted');
  });

  it('errors when execution is not found', async () => {
    const { eventsClient, executionClient } = createMockClients();

    eventsClient.readEvents.mockResolvedValueOnce([]);
    executionClient.get.mockResolvedValueOnce(undefined);

    const result = await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('not found');
  });

  it('respects the since parameter', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const complete = roundCompleteEvent();

    eventsClient.readEvents.mockResolvedValueOnce([createEventDoc(6, complete)]);
    executionClient.get.mockResolvedValueOnce(
      createExecution({ status: ExecutionStatus.completed })
    );

    await collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
        since: 5,
      })
    );

    expect(eventsClient.readEvents).toHaveBeenCalledWith(EXECUTION_ID, 5);
  });

  it('times out after FOLLOW_EXECUTION_TIMEOUT_MS', async () => {
    const { eventsClient, executionClient } = createMockClients();

    // Return events periodically so the idle timeout doesn't fire first,
    // but the execution never reaches a terminal status.
    let callCount = 0;
    eventsClient.readEvents.mockImplementation(async () => {
      callCount++;
      return [createEventDoc(callCount, messageChunkEvent(`msg-${callCount}`))];
    });
    executionClient.get.mockResolvedValue(createExecution({ status: ExecutionStatus.running }));

    const promise = collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    // Advance past the total timeout
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('no terminal status');
  });

  it('times out after FOLLOW_EXECUTION_IDLE_TIMEOUT_MS of inactivity', async () => {
    const { eventsClient, executionClient } = createMockClients();

    // Always return no events, status stays scheduled (no change)
    eventsClient.readEvents.mockResolvedValue([]);
    // Return 'scheduled' every time — after the first poll sets lastStatus,
    // subsequent polls see no change, so lastActivityTime is never reset.
    executionClient.get.mockResolvedValue(createExecution({ status: ExecutionStatus.scheduled }));

    const promise = collectEvents(
      followExecution$({
        executionId: EXECUTION_ID,
        eventsClient,
        executionClient,
      })
    );

    // Advance past the idle timeout
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_IDLE_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('no activity');
  });

  it('stops emitting events after unsubscribe', async () => {
    const { eventsClient, executionClient } = createMockClients();

    const events: ChatEvent[] = [];
    let pollCount = 0;

    eventsClient.readEvents.mockImplementation(async () => {
      pollCount++;
      return [createEventDoc(pollCount, messageChunkEvent(`msg-${pollCount}`))];
    });
    executionClient.get.mockResolvedValue(createExecution({ status: ExecutionStatus.running }));

    const subscription = followExecution$({
      executionId: EXECUTION_ID,
      eventsClient,
      executionClient,
    }).subscribe({
      next: (event) => events.push(event),
    });

    // Let first poll complete
    await jest.advanceTimersByTimeAsync(0);
    expect(events).toHaveLength(1);

    // Unsubscribe
    subscription.unsubscribe();

    // Advance time — no more events should be emitted
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_POLL_INTERVAL_MS * 5);
    expect(events).toHaveLength(1);
  });
});
