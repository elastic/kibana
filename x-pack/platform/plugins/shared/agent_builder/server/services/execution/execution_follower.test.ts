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
import type { AgentExecutionClient, ExecutionPeek } from './persistence';
import { ExecutionStatus } from './types';
import { followExecution$ } from './execution_follower';
import * as constants from './constants';

const EXECUTION_ID = 'exec-1';

const createMockExecutionClient = () =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    appendEvents: jest.fn(),
    peek: jest.fn(),
    readEvents: jest.fn(),
  } as jest.Mocked<AgentExecutionClient>);

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
 * Helper to build the return value of `executionClient.peek`.
 */
const peekResult = (
  status: ExecutionStatus,
  eventCount: number,
  error?: { code: AgentBuilderErrorCode; message: string }
): ExecutionPeek => ({ status, eventCount, error });

/**
 * Helper to build the return value of `executionClient.readEvents`.
 */
const readEventsResult = (
  events: ChatEvent[],
  status: ExecutionStatus,
  error?: { code: AgentBuilderErrorCode; message: string }
) => ({ events, status, error });

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
    const executionClient = createMockExecutionClient();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    // peek: completed with 2 events
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.completed, 2));
    // readEvents: returns both events
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([chunk, complete], ExecutionStatus.completed)
    );

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
  });

  it('polls multiple times before terminal status', async () => {
    const executionClient = createMockExecutionClient();

    const chunk1 = messageChunkEvent('a');
    const chunk2 = messageChunkEvent('b');
    const complete = roundCompleteEvent();

    // Poll 1: peek says running with 1 event
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.running, 1));
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([chunk1], ExecutionStatus.running)
    );

    // Poll 2: peek says completed with 3 events total
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.completed, 3));
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([chunk2, complete], ExecutionStatus.completed)
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance past the poll interval to trigger second poll
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_POLL_INTERVAL_MS);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk1, chunk2, complete]);
    expect(executionClient.readEvents).toHaveBeenCalledTimes(2);
  });

  it('drains remaining events when roundComplete is not in the initial batch', async () => {
    const executionClient = createMockExecutionClient();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    // Poll 1: peek says completed with 1 event (no roundComplete yet)
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.completed, 1));
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([chunk], ExecutionStatus.completed)
    );

    // Drain retry 1: roundComplete arrives
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([complete], ExecutionStatus.completed)
    );

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
    // Initial read + 1 drain retry
    expect(executionClient.readEvents).toHaveBeenCalledTimes(2);
  });

  it('drains with retries and delay when events are not immediately available', async () => {
    const executionClient = createMockExecutionClient();

    const chunk = messageChunkEvent('hi');
    const complete = roundCompleteEvent();

    // Poll 1: peek says completed with 1 event (no roundComplete)
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.completed, 1));
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([chunk], ExecutionStatus.completed)
    );

    // Drain retry 1: nothing yet
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([], ExecutionStatus.completed)
    );
    // Drain retry 2: roundComplete arrives
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([complete], ExecutionStatus.completed)
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance past the drain retry delay
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_TERMINAL_READ_RETRY_DELAY_MS);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([chunk, complete]);
    // Initial read + 2 drain retries
    expect(executionClient.readEvents).toHaveBeenCalledTimes(3);
  });

  it('errors with structured error on failed execution with error details', async () => {
    const executionClient = createMockExecutionClient();

    // peek: failed with error, no events
    executionClient.peek.mockResolvedValueOnce(
      peekResult(ExecutionStatus.failed, 0, {
        code: AgentBuilderErrorCode.agentExecutionError,
        message: 'something went wrong',
      })
    );

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toBe('something went wrong');
    // Should NOT have called readEvents (no new events)
    expect(executionClient.readEvents).not.toHaveBeenCalled();
  });

  it('errors with internal error on failed execution without error details', async () => {
    const executionClient = createMockExecutionClient();

    // peek: failed without error, no events
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.failed, 0));

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('failed');
  });

  it('errors on aborted execution', async () => {
    const executionClient = createMockExecutionClient();

    // peek: aborted, no events
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.aborted, 0));

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('aborted');
  });

  it('errors when execution is not found', async () => {
    const executionClient = createMockExecutionClient();

    // peek returns undefined (not found)
    executionClient.peek.mockResolvedValueOnce(undefined);

    const result = await collectEvents(
      followExecution$({ executionId: EXECUTION_ID, executionClient })
    );

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('not found');
  });

  it('respects the since parameter', async () => {
    const executionClient = createMockExecutionClient();

    const complete = roundCompleteEvent();

    // peek: completed with 6 events total (since=5 means we expect 1 new event)
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.completed, 6));
    executionClient.readEvents.mockResolvedValueOnce(
      readEventsResult([complete], ExecutionStatus.completed)
    );

    await collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient, since: 5 }));

    expect(executionClient.readEvents).toHaveBeenCalledWith(EXECUTION_ID, 5);
  });

  it('times out after FOLLOW_EXECUTION_TIMEOUT_MS', async () => {
    const executionClient = createMockExecutionClient();

    // peek always returns running with increasing event count
    let peekCount = 0;
    executionClient.peek.mockImplementation(async () => {
      peekCount++;
      return peekResult(ExecutionStatus.running, peekCount);
    });

    // readEvents returns one event per call
    let readCount = 0;
    executionClient.readEvents.mockImplementation(async () => {
      readCount++;
      return readEventsResult([messageChunkEvent(`msg-${readCount}`)], ExecutionStatus.running);
    });

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance past the total timeout
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('no terminal status');
  });

  it('times out after FOLLOW_EXECUTION_IDLE_TIMEOUT_MS of inactivity', async () => {
    const executionClient = createMockExecutionClient();

    // peek: always scheduled with 0 events (no change)
    executionClient.peek.mockResolvedValue(peekResult(ExecutionStatus.scheduled, 0));

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance past the idle timeout
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_IDLE_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('no activity');
  });

  it('stops emitting events after unsubscribe', async () => {
    const executionClient = createMockExecutionClient();

    const events: ChatEvent[] = [];
    let peekCount = 0;

    // peek: running with increasing event count
    executionClient.peek.mockImplementation(async () => {
      peekCount++;
      return peekResult(ExecutionStatus.running, peekCount);
    });

    let readCount = 0;
    executionClient.readEvents.mockImplementation(async () => {
      readCount++;
      return readEventsResult([messageChunkEvent(`msg-${readCount}`)], ExecutionStatus.running);
    });

    const subscription = followExecution$({
      executionId: EXECUTION_ID,
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
