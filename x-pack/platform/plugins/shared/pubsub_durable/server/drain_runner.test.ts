/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PubSubDurableSubscription } from '@kbn/core-pubsub-server';
import {
  FAILURE_BACKOFF_MS,
  HANDLER_TIMEOUT_MS,
  INITIAL_IDLE_MS,
  MAX_ATTEMPTS_PER_EVENT,
  PAGE_SIZE,
} from './constants';
import type { DrainState } from './drain_runner';
import { runDrain } from './drain_runner';
import type { EventsStore, StoredEvent } from './events_store';

const NOW = 1_000_000;

/** An in-memory store whose sequence numbers are the array positions of `events`. */
const createStore = (events: StoredEvent[], checkpoint: number): jest.Mocked<EventsStore> => ({
  append: jest.fn(),
  getGlobalCheckpoint: jest.fn().mockResolvedValue(checkpoint),
  readPage: jest.fn(async ({ topic, afterSeqNo, throughSeqNo, size }) =>
    events
      .filter((e) => e.topic === topic && e.seqNo > afterSeqNo && e.seqNo <= throughSeqNo)
      .slice(0, size)
  ),
});

const event = (seqNo: number, topic = 't'): StoredEvent => ({
  seqNo,
  id: `e${seqNo}`,
  topic,
  acceptedAt: 'now',
  data: { seqNo },
});

const run = (
  store: EventsStore,
  state: DrainState,
  deliver: PubSubDurableSubscription['deliver'] | undefined,
  signal = new AbortController().signal
) =>
  runDrain({
    consumer: 'p.c',
    topic: 't',
    state,
    subscription: deliver ? { topic: 't', consumer: 'p.c', deliver } : undefined,
    store,
    logger: loggerMock.create(),
    signal,
    now: () => NOW,
  });

const state = (overrides: Partial<DrainState> = {}): DrainState => ({
  cursor: 10,
  idleMs: INITIAL_IDLE_MS,
  failing: null,
  ...overrides,
});

describe('runDrain', () => {
  it('starts a new consumer from the current checkpoint without delivering', async () => {
    const deliver = jest.fn();
    const result = await run(
      createStore([event(1), event(2)], 2),
      state({ cursor: null }),
      deliver
    );

    expect(result.state.cursor).toBe(2);
    expect(deliver).not.toHaveBeenCalled();
  });

  it('leaves state alone and retries later when this node has no handler', async () => {
    const input = state();
    const result = await run(createStore([], 20), input, undefined);

    expect(result.state).toBe(input);
    expect(result.runAt.getTime()).toBe(NOW + 30_000);
  });

  it('is idle when the checkpoint equals the cursor, doubling the idle delay up to the cap', async () => {
    const store = createStore([], 10);
    const first = await run(store, state({ idleMs: 5_000 }), jest.fn());
    expect(first.runAt.getTime()).toBe(NOW + 5_000);
    expect(first.state.idleMs).toBe(10_000);

    const capped = await run(store, state({ idleMs: 200_000 }), jest.fn());
    expect(capped.state.idleMs).toBe(300_000);
    expect(store.readPage).not.toHaveBeenCalled();
  });

  it('delivers in order and moves the cursor to the checkpoint when the page is not full', async () => {
    const delivered: string[] = [];
    const deliver = jest.fn(async ({ id }: { id: string }) => {
      delivered.push(id);
    });
    // Event 13 belongs to another topic, 15 is the checkpoint with no event on this topic.
    const store = createStore([event(11), event(12), event(13, 'other'), event(14)], 15);
    const result = await run(store, state(), deliver);

    expect(delivered).toEqual(['e11', 'e12', 'e14']);
    expect(result.state.cursor).toBe(15);
    expect(result.runAt.getTime()).toBe(NOW + 5_000);
    expect(result.error).toBeUndefined();
  });

  it('never delivers events past the checkpoint', async () => {
    const deliver = jest.fn();
    const result = await run(createStore([event(11), event(12)], 11), state(), deliver);

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(result.state.cursor).toBe(11);
  });

  it('on a full page, moves the cursor to the last handled event and runs again now', async () => {
    const events = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => event(11 + i));
    const result = await run(createStore(events, 11 + PAGE_SIZE + 4), state(), jest.fn());

    expect(result.state.cursor).toBe(10 + PAGE_SIZE);
    expect(result.runAt.getTime()).toBe(NOW);
  });

  it('advances past events on other topics when nothing matched', async () => {
    const result = await run(createStore([event(11, 'other')], 11), state(), jest.fn());

    expect(result.state.cursor).toBe(11);
    expect(result.runAt.getTime()).toBe(NOW + INITIAL_IDLE_MS);
    expect(result.state.idleMs).toBe(INITIAL_IDLE_MS * 2);
  });

  it('stops at the first failure, keeps progress, records the attempt and backs off', async () => {
    const deliver = jest.fn(async ({ id }: { id: string }) => {
      if (id === 'e12') throw new Error('boom');
    });
    const result = await run(createStore([event(11), event(12), event(13)], 13), state(), deliver);

    expect(deliver).toHaveBeenCalledTimes(2);
    expect(result.state.cursor).toBe(11);
    expect(result.state.failing).toEqual({ seqNo: 12, attempts: 1 });
    expect(result.runAt.getTime()).toBe(NOW + FAILURE_BACKOFF_MS[0]);
    expect(result.error?.message).toBe('boom');
  });

  it('counts attempts per sequence number and backs off further', async () => {
    const deliver = jest.fn().mockRejectedValue(new Error('boom'));
    const result = await run(
      createStore([event(11)], 11),
      state({ failing: { seqNo: 11, attempts: 2 } }),
      deliver
    );

    expect(result.state.failing).toEqual({ seqNo: 11, attempts: 3 });
    expect(result.runAt.getTime()).toBe(NOW + FAILURE_BACKOFF_MS[2]);
  });

  it('restarts the attempt count when a different event fails', async () => {
    const deliver = jest.fn().mockRejectedValue(new Error('boom'));
    const result = await run(
      createStore([event(11)], 11),
      state({ failing: { seqNo: 9, attempts: 4 } }),
      deliver
    );

    expect(result.state.failing).toEqual({ seqNo: 11, attempts: 1 });
  });

  it('parks an event after the maximum attempts, then delivers the rest', async () => {
    const events = [event(11), event(12), event(13)];
    const store = createStore(events, 13);
    const delivered: string[] = [];
    const deliver = jest.fn(async ({ id }: { id: string }) => {
      if (id === 'e11') throw new Error('boom');
      delivered.push(id);
    });

    let current = state();
    for (let attempt = 1; attempt < MAX_ATTEMPTS_PER_EVENT; attempt++) {
      const result = await run(store, current, deliver);
      expect(result.error).toBeDefined();
      expect(result.state.cursor).toBe(10);
      current = result.state;
    }

    const parked = await run(store, current, deliver);
    expect(parked.error).toBeUndefined();
    expect(parked.state).toEqual({ cursor: 11, idleMs: INITIAL_IDLE_MS, failing: null });
    expect(parked.runAt.getTime()).toBe(NOW);

    const rest = await run(store, parked.state, deliver);
    expect(delivered).toEqual(['e12', 'e13']);
    expect(rest.state.cursor).toBe(13);
  });

  it('never moves the cursor backwards across runs', async () => {
    const store = createStore([event(11), event(12), event(13)], 13);
    const deliver = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined);

    const first = await run(store, state(), deliver);
    const second = await run(store, first.state, deliver);

    expect(first.state.cursor).toBe(11);
    expect(second.state.cursor).toBeGreaterThanOrEqual(first.state.cursor!);
  });

  it('stops without delivering when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const deliver = jest.fn();
    const result = await run(createStore([event(11)], 11), state(), deliver, controller.signal);

    expect(deliver).not.toHaveBeenCalled();
    expect(result.state.cursor).toBe(10);
    expect(result.runAt.getTime()).toBe(NOW);
  });

  describe('handler timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('counts a handler that exceeds the limit as a failed attempt', async () => {
      const deliver = jest.fn(() => new Promise<void>(() => {}));
      const promise = run(createStore([event(11)], 11), state(), deliver);
      await jest.advanceTimersByTimeAsync(HANDLER_TIMEOUT_MS + 1);
      const result = await promise;

      expect(result.state.cursor).toBe(10);
      expect(result.state.failing).toEqual({ seqNo: 11, attempts: 1 });
      expect(result.error?.message).toContain('did not finish');
    });
  });
});
