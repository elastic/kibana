/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type {
  ChatEvent,
  ExecutionFailedEvent,
  ExecutionTerminatedEvent,
  RoundCompleteEvent,
  RoundInterruptedEvent,
  RoundStartedEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  TimelineEventType,
  createRequestAbortedError,
} from '@kbn/agent-builder-common';
import { trackExecutionInterruption } from './track_execution_interruption';

const roundStarted: RoundStartedEvent = {
  type: ChatEventType.roundStarted,
  data: { round_id: 'r1', input: { message: 'hi' }, started_at: '2024-01-01T00:00:00.000Z' },
};
const roundInterrupted: RoundInterruptedEvent = {
  type: ChatEventType.roundInterrupted,
  data: {
    round_id: 'r1',
    started_at: '2024-01-01T00:00:00.000Z',
    input: { message: 'hi' },
    steps: [],
    summary: { time_to_last_token: 1 },
    attachments: [],
  },
};
const roundComplete: RoundCompleteEvent = {
  type: ChatEventType.roundComplete,
  data: { round: { id: 'r1' } as never },
};
const executionTerminated: ExecutionTerminatedEvent = {
  id: 'r1::execution_terminated',
  type: TimelineEventType.executionTerminated,
  created_at: '2024-01-01T00:00:01.000Z',
  actor: { type: 'agent', id: 'a' } as never,
  execution_id: 'r1::execution',
  trigger_event_id: 'r1::user_message',
  data: { outcome: { type: 'responded', response: { message: 'ok' } } } as never,
};
const executionFailed: ExecutionFailedEvent = {
  id: 'r1::execution_failed',
  type: TimelineEventType.executionFailed,
  created_at: '2024-01-01T00:00:01.000Z',
  actor: { type: 'agent', id: 'a' } as never,
  execution_id: 'r1::execution',
  trigger_event_id: 'r1::user_message',
  data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } as never },
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

const run = async (events: ChatEvent[], error: unknown, persistResult: ChatEvent[] = []) => {
  const persist = jest.fn().mockResolvedValue(persistResult);
  const source$ = new Subject<ChatEvent>();
  const seen: ChatEvent[] = [];
  let thrown: unknown;
  let completed = false;
  source$.pipe(trackExecutionInterruption({ persist })).subscribe({
    next: (event) => seen.push(event),
    error: (err) => {
      thrown = err;
    },
    complete: () => {
      completed = true;
    },
  });
  events.forEach((event) => source$.next(event));
  source$.error(error);
  await flush();
  return { persist, seen, thrown, completed };
};

describe('trackExecutionInterruption', () => {
  it('round_complete unseen: persists the interruption with the round_interrupted payload', async () => {
    const error = new Error('boom');
    const { persist } = await run([roundStarted, roundInterrupted], error);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ error, interrupted: roundInterrupted.data });
    expect(persist.mock.calls[0][0]).not.toHaveProperty('completed');
  });

  it('round_complete unseen, no round_interrupted: persists a minimal interruption', async () => {
    const error = createRequestAbortedError('stop');
    const { persist } = await run([roundStarted], error);

    expect(persist).toHaveBeenCalledWith({ error, interrupted: undefined });
  });

  it('persisted execution_terminated seen: does nothing on a late abort', async () => {
    const { persist } = await run(
      [roundStarted, roundComplete, executionTerminated],
      createRequestAbortedError('stop')
    );

    expect(persist).not.toHaveBeenCalled();
  });

  it('round_complete seen, abort during the in-flight success write: does nothing', async () => {
    const { persist } = await run([roundStarted, roundComplete], createRequestAbortedError('stop'));

    expect(persist).not.toHaveBeenCalled();
  });

  it('round_complete seen, non-abort error (success write failed): persists from the round_complete payload', async () => {
    const error = new Error('write failed');
    const { persist } = await run([roundStarted, roundComplete], error);

    expect(persist).toHaveBeenCalledWith({ error, completed: roundComplete.data });
    expect(persist.mock.calls[0][0]).not.toHaveProperty('interrupted');
  });

  it('both round_interrupted and round_complete seen with a non-abort error: completed wins', async () => {
    const error = new Error('write failed');
    const { persist } = await run([roundStarted, roundInterrupted, roundComplete], error);

    expect(persist).toHaveBeenCalledWith({ error, completed: roundComplete.data });
  });

  it('emits the persisted terminal(s) before the original error, same error reference', async () => {
    const error = new Error('boom');
    const { seen, thrown } = await run([roundStarted, roundInterrupted], error, [executionFailed]);

    expect(seen.map((event) => event.type)).toEqual([
      ChatEventType.roundStarted,
      ChatEventType.roundInterrupted,
      TimelineEventType.executionFailed,
    ]);
    expect(thrown).toBe(error);
  });

  it('forwards events untouched and completes when the source completes', () => {
    const persist = jest.fn();
    const source$ = new Subject<ChatEvent>();
    const seen: ChatEvent[] = [];
    let completed = false;
    source$.pipe(trackExecutionInterruption({ persist })).subscribe({
      next: (event) => seen.push(event),
      complete: () => {
        completed = true;
      },
    });
    source$.next(roundStarted);
    source$.next(roundComplete);
    source$.next(executionTerminated);
    source$.complete();

    expect(seen).toEqual([roundStarted, roundComplete, executionTerminated]);
    expect(completed).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('still surfaces the original error when persist rejects', async () => {
    const error = new Error('boom');
    const persist = jest.fn().mockRejectedValue(new Error('store down'));
    const source$ = new Subject<ChatEvent>();
    const seen: ChatEvent[] = [];
    let thrown: unknown;
    source$.pipe(trackExecutionInterruption({ persist })).subscribe({
      next: (event) => seen.push(event),
      error: (err) => {
        thrown = err;
      },
    });
    source$.next(roundStarted);
    source$.error(error);
    await flush();

    expect(thrown).toBe(error);
    expect(seen).toEqual([roundStarted]);
  });

  it('tears down the source on unsubscribe and never persists afterwards', async () => {
    const persist = jest.fn();
    const source$ = new Subject<ChatEvent>();
    const subscription = source$.pipe(trackExecutionInterruption({ persist })).subscribe();

    subscription.unsubscribe();
    expect(source$.observed).toBe(false);
    source$.error(new Error('late'));
    await flush();

    expect(persist).not.toHaveBeenCalled();
  });
});
