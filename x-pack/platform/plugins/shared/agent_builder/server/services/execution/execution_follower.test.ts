/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  AgentBuilderErrorCode,
  TimelineEventType,
  isAgentBuilderError,
  isRequestAbortedError,
} from '@kbn/agent-builder-common';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecutionClient, ExecutionPeek } from './persistence';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import { followExecution$ } from './execution_follower';
import * as constants from './constants';

const EXECUTION_ID = 'exec-1';

const createMockExecutionClient = () =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    appendEvents: jest.fn(),
    updateHeartbeat: jest.fn(),
    peek: jest.fn(),
    readEvents: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
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

const terminalEvent = (
  type: TimelineEventType.executionFailed | TimelineEventType.executionAborted
): ChatEvent =>
  ({
    id: `round-1::${type}`,
    type,
    created_at: '2024-01-01T00:00:01.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: { time_to_last_token: 1 },
  } as unknown as ChatEvent);

/**
 * Helper to build the return value of `executionClient.peek`.
 */
const peekResult = (
  status: ExecutionStatus,
  eventCount: number,
  error?: { code: AgentBuilderErrorCode; message: string },
  lastHeartbeat?: string
): ExecutionPeek => ({ status, eventCount, error, lastHeartbeat });

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
    executionClient.readEvents.mockResolvedValue(readEventsResult([], ExecutionStatus.failed));

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));
    await jest.advanceTimersByTimeAsync(
      constants.FOLLOW_TERMINAL_READ_MAX_RETRIES * constants.FOLLOW_TERMINAL_READ_RETRY_DELAY_MS
    );
    const result = await promise;

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toBe('something went wrong');
    expect(result.events).toEqual([]);
  });

  it('errors with internal error on failed execution without error details', async () => {
    const executionClient = createMockExecutionClient();

    // peek: failed without error, no events
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.failed, 0));
    executionClient.readEvents.mockResolvedValue(readEventsResult([], ExecutionStatus.failed));

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));
    await jest.advanceTimersByTimeAsync(
      constants.FOLLOW_TERMINAL_READ_MAX_RETRIES * constants.FOLLOW_TERMINAL_READ_RETRY_DELAY_MS
    );
    const result = await promise;

    expect(result.error).toBeDefined();
    expect(isAgentBuilderError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('failed');
  });

  it('errors on aborted execution once the drain window elapses without a terminal event', async () => {
    const executionClient = createMockExecutionClient();

    // peek: aborted, no events; the worker never writes execution_aborted (worker lost)
    executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.aborted, 0));
    executionClient.readEvents.mockResolvedValue(readEventsResult([], ExecutionStatus.aborted));

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_ABORT_DRAIN_TIMEOUT_MS + 1000);
    const result = await promise;

    expect(result.error).toBeDefined();
    expect(isRequestAbortedError(result.error!)).toBe(true);
    expect(result.error!.message).toContain('aborted');
    expect(result.events).toEqual([]);
  });

  it('rebuilds the execution error with its cause chain on failed', async () => {
    const executionClient = createMockExecutionClient();
    executionClient.peek.mockResolvedValueOnce({
      status: ExecutionStatus.failed,
      eventCount: 0,
      error: {
        code: AgentBuilderErrorCode.internalError,
        message: 'Error executing agent',
        causes: [{ name: 'Error', message: 'Error calling connector', code: 'connector_error' }],
      } as never,
    });
    executionClient.readEvents.mockResolvedValue(readEventsResult([], ExecutionStatus.failed));

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));
    await jest.advanceTimersByTimeAsync(
      constants.FOLLOW_TERMINAL_READ_MAX_RETRIES * constants.FOLLOW_TERMINAL_READ_RETRY_DELAY_MS
    );
    const result = await promise;

    const cause = (result.error as Error & { cause?: Error & { code?: string } }).cause;
    expect(cause?.message).toBe('Error calling connector');
    expect(cause?.code).toBe('connector_error');
  });

  describe('terminal timeline events on failed / aborted', () => {
    it('failed: the terminal read in the same poll is yielded and no drain read follows', async () => {
      const executionClient = createMockExecutionClient();
      const chunk = messageChunkEvent('partial');
      const failed = terminalEvent(TimelineEventType.executionFailed);

      executionClient.peek.mockResolvedValueOnce(
        peekResult(ExecutionStatus.failed, 2, {
          code: AgentBuilderErrorCode.internalError,
          message: 'boom',
        })
      );
      executionClient.readEvents.mockResolvedValueOnce(
        readEventsResult([chunk, failed], ExecutionStatus.failed)
      );

      const result = await collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );

      expect(result.events).toEqual([chunk, failed]);
      expect(result.error!.message).toBe('boom');
      expect(executionClient.readEvents).toHaveBeenCalledTimes(1);
    });

    it('failed: a terminal not yet readable is drained on the next read, then the error is thrown', async () => {
      const executionClient = createMockExecutionClient();
      const failed = terminalEvent(TimelineEventType.executionFailed);

      executionClient.peek.mockResolvedValueOnce(
        peekResult(ExecutionStatus.failed, 0, {
          code: AgentBuilderErrorCode.internalError,
          message: 'boom',
        })
      );
      executionClient.readEvents.mockResolvedValueOnce(
        readEventsResult([failed], ExecutionStatus.failed)
      );

      const result = await collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );

      expect(result.events).toEqual([failed]);
      expect(result.error!.message).toBe('boom');
      expect(executionClient.readEvents).toHaveBeenCalledTimes(1);
    });

    it('failed: a terminal read while still running is latched, so no drain read happens later', async () => {
      const executionClient = createMockExecutionClient();
      const failed = terminalEvent(TimelineEventType.executionFailed);

      // poll 1: running, the event batch (incl. the terminal) landed before the status update
      executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.running, 1));
      executionClient.readEvents.mockResolvedValueOnce(
        readEventsResult([failed], ExecutionStatus.running)
      );
      // poll 2: failed, nothing new
      executionClient.peek.mockResolvedValueOnce(
        peekResult(ExecutionStatus.failed, 1, {
          code: AgentBuilderErrorCode.internalError,
          message: 'boom',
        })
      );

      const promise = collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );
      await jest.advanceTimersByTimeAsync(constants.FOLLOW_POLL_INTERVAL_MS);
      const result = await promise;

      expect(result.events).toEqual([failed]);
      expect(result.error!.message).toBe('boom');
      expect(executionClient.readEvents).toHaveBeenCalledTimes(1);
    });

    it('aborted: rebuilds the persisted abort error, with its abort_reason, once the worker recorded it', async () => {
      const executionClient = createMockExecutionClient();
      const aborted = terminalEvent(TimelineEventType.executionAborted);
      const persistedError = {
        code: AgentBuilderErrorCode.requestAborted,
        message: 'Converse request was aborted',
        meta: { abort_reason: { source: 'api', actor: { id: 'u1' } } },
      };

      // first poll: aborted, error not recorded yet; the peek after the drain has it
      executionClient.peek
        .mockResolvedValueOnce(peekResult(ExecutionStatus.aborted, 0))
        .mockResolvedValueOnce({
          status: ExecutionStatus.aborted,
          eventCount: 1,
          error: persistedError as never,
        });
      executionClient.readEvents.mockResolvedValueOnce(
        readEventsResult([aborted], ExecutionStatus.aborted)
      );

      const result = await collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );

      expect(result.events).toEqual([aborted]);
      expect(isRequestAbortedError(result.error!)).toBe(true);
      expect(
        (result.error as unknown as { meta: Record<string, unknown> }).meta.abort_reason
      ).toEqual({
        source: 'api',
        actor: { id: 'u1' },
      });
    });

    it('aborted: derives abort_reason from the drained execution_aborted when no error is recorded yet', async () => {
      const executionClient = createMockExecutionClient();
      const aborted = {
        ...terminalEvent(TimelineEventType.executionAborted),
        data: { time_to_last_token: 1, aborted_by: { source: 'task_manager' } },
      } as ChatEvent;

      executionClient.peek.mockResolvedValue(peekResult(ExecutionStatus.aborted, 0));
      executionClient.readEvents.mockResolvedValueOnce(
        readEventsResult([aborted], ExecutionStatus.aborted)
      );

      const result = await collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );

      expect(isRequestAbortedError(result.error!)).toBe(true);
      expect(
        (result.error as unknown as { meta: Record<string, unknown> }).meta.abort_reason
      ).toEqual({
        source: 'task_manager',
      });
    });

    it('aborted: drains until execution_aborted arrives, yields it, then throws RequestAbortedError', async () => {
      const executionClient = createMockExecutionClient();
      const aborted = terminalEvent(TimelineEventType.executionAborted);

      executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.aborted, 0));
      // first drain read: the worker has not persisted the terminal yet; second: it has
      executionClient.readEvents
        .mockResolvedValueOnce(readEventsResult([], ExecutionStatus.aborted))
        .mockResolvedValueOnce(readEventsResult([aborted], ExecutionStatus.aborted));

      const promise = collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );
      await jest.advanceTimersByTimeAsync(constants.FOLLOW_POLL_INTERVAL_MS);
      const result = await promise;

      expect(result.events).toEqual([aborted]);
      expect(isRequestAbortedError(result.error!)).toBe(true);
      expect(executionClient.readEvents).toHaveBeenCalledTimes(2);
    });

    it('aborted: a terminal written late in the worker chain is still drained (the bound covers detection latency)', async () => {
      const executionClient = createMockExecutionClient();
      const aborted = terminalEvent(TimelineEventType.executionAborted);
      const writtenAt =
        Date.now() +
        constants.ABORT_POLL_INTERVAL_MS +
        constants.CANCELLATION_DEADLINE_MS +
        constants.EVENT_BATCH_INTERVAL_MS;

      executionClient.peek.mockResolvedValueOnce(peekResult(ExecutionStatus.aborted, 0));
      executionClient.readEvents.mockImplementation(async () =>
        Date.now() >= writtenAt
          ? readEventsResult([aborted], ExecutionStatus.aborted)
          : readEventsResult([], ExecutionStatus.aborted)
      );

      const promise = collectEvents(
        followExecution$({ executionId: EXECUTION_ID, executionClient })
      );
      await jest.advanceTimersByTimeAsync(constants.FOLLOW_ABORT_DRAIN_TIMEOUT_MS);
      const result = await promise;

      expect(result.events).toEqual([aborted]);
      expect(isRequestAbortedError(result.error!)).toBe(true);
    });
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

  it('times out after FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS when the heartbeat is stale', async () => {
    const executionClient = createMockExecutionClient();

    // peek: always running with 0 events and a frozen heartbeat (executing node went silent)
    executionClient.peek.mockResolvedValue(
      peekResult(ExecutionStatus.running, 0, undefined, 'hb-frozen')
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance past the heartbeat timeout
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('no heartbeat');
  });

  it('does not time out while the heartbeat keeps advancing, even with no new events', async () => {
    const executionClient = createMockExecutionClient();

    const complete = roundCompleteEvent();

    // Simulate a long silent step: many polls with 0 new events but an advancing heartbeat,
    // spanning well past the heartbeat timeout window, then a terminal completed status.
    // Completion after ~150 polls (~75s at a 500ms poll interval) exceeds the 60s timeout.
    let pollCount = 0;
    executionClient.peek.mockImplementation(async () => {
      pollCount++;
      if (pollCount < 150) {
        return peekResult(ExecutionStatus.running, 0, undefined, `hb-${pollCount}`);
      }
      return peekResult(ExecutionStatus.completed, 1, undefined, `hb-${pollCount}`);
    });
    executionClient.readEvents.mockResolvedValue(
      readEventsResult([complete], ExecutionStatus.completed)
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // Advance well past the heartbeat timeout — a silent-but-alive execution must survive.
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS * 2);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([complete]);
  });

  it('does not abort a still-queued (scheduled) execution within the heartbeat window', async () => {
    const executionClient = createMockExecutionClient();

    const complete = roundCompleteEvent();
    let pollCount = 0;
    executionClient.peek.mockImplementation(async () => {
      pollCount++;
      if (pollCount < 150) {
        return peekResult(ExecutionStatus.scheduled, 0, undefined, 'hb-created');
      }
      return peekResult(ExecutionStatus.completed, 1, undefined, 'hb-run');
    });
    executionClient.readEvents.mockResolvedValue(
      readEventsResult([complete], ExecutionStatus.completed)
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    // ~75s queued (150 polls) — past the heartbeat window, within the scheduled grace.
    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS * 2);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([complete]);
  });

  it('times out a scheduled execution never claimed after FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS', async () => {
    const executionClient = createMockExecutionClient();

    // Always queued, never claimed by a worker.
    executionClient.peek.mockResolvedValue(
      peekResult(ExecutionStatus.scheduled, 0, undefined, 'hb-created')
    );

    const promise = collectEvents(followExecution$({ executionId: EXECUTION_ID, executionClient }));

    await jest.advanceTimersByTimeAsync(constants.FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS + 1000);

    const result = await promise;

    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('timed out');
    expect(result.error!.message).toContain('not claimed');
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
