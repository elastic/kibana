/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { Subject } from 'rxjs';
import { createActor } from 'xstate';
import { createFixtureUnitStatsClient } from '../../../services/unit_stats_client/fixture_unit_stats_client';
import type { StatsWindow, UnitStatsClient } from '../../../services/unit_stats_client/types';
import { STATS_BATCH_DEBOUNCE_MS, STATS_MAX_CONSECUTIVE_FAILURES } from './constants';
import { createStatsManagerImplementations, statsManagerMachine } from './stats_manager_machine';

const destination = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'destination', id });
const processor = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'processor', id });

const ES_PROD = destination('es-prod');
const ES_DEV = destination('es-dev');
const UPPERCASE = processor('uppercase-message');

const startedActors: Array<{ stop: () => void }> = [];

const DEFAULT_WINDOW: StatsWindow = { kind: 'default' };

const startManager = ({
  client,
  pollIntervalMs,
  getWindow = () => DEFAULT_WINDOW,
}: {
  client: UnitStatsClient;
  pollIntervalMs?: number;
  getWindow?: () => StatsWindow;
}) => {
  const timeState$ = new Subject<unknown>();
  const actor = createActor(
    statsManagerMachine.provide(createStatsManagerImplementations({ client, timeState$ })),
    { input: { getWindow, pollIntervalMs } }
  );
  actor.start();
  startedActors.push(actor);

  const register = (ref: StreamsUnit.StatsComponentRef, registrant = `registrant-${ref.id}`) =>
    actor.send({ type: 'stats.register', ref, registrant });
  const unregister = (ref: StreamsUnit.StatsComponentRef, registrant = `registrant-${ref.id}`) =>
    actor.send({ type: 'stats.unregister', ref, registrant });
  const destinationEntry = (id: string) =>
    actor.getSnapshot().context.components.destination[id]?.entry;
  const processorEntry = (id: string) =>
    actor.getSnapshot().context.components.processor[id]?.entry;

  return { actor, timeState$, register, unregister, destinationEntry, processorEntry };
};

/** A fixture client whose calls are recorded. A delay makes the response arrive later. */
const createClient = ({
  scenario = 'data',
  delayMs = 0,
}: {
  scenario?: Parameters<typeof createFixtureUnitStatsClient>[0]['scenario'];
  delayMs?: number;
} = {}) => {
  const client = createFixtureUnitStatsClient({ scenario, delayMs });
  const fetchStats = jest.spyOn(client, 'fetchStats');
  return { client, fetchStats };
};

const requestedComponents = (fetchStats: jest.SpyInstance, call: number) =>
  fetchStats.mock.calls[call][0].components;

/** The signal that the client received for a call. It aborts when the machine stops the request. */
const signalOf = (fetchStats: jest.SpyInstance, call: number): AbortSignal =>
  fetchStats.mock.calls[call][1].signal;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  startedActors.splice(0).forEach((actor) => actor.stop());
  jest.useRealTimers();
});

describe('registration and the debounce', () => {
  it('does not fetch before the debounce ends', async () => {
    const { client, fetchStats } = createClient();
    const { register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS - 1);
    expect(fetchStats).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(fetchStats).toHaveBeenCalledTimes(1);
  });

  it('joins a burst of registrations into one request', async () => {
    const { client, fetchStats } = createClient();
    const { register } = startManager({ client });

    // Each registration restarts the debounce, so these are one flush.
    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(100);
    register(ES_DEV);
    await jest.advanceTimersByTimeAsync(100);
    register(UPPERCASE);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(fetchStats).toHaveBeenCalledTimes(1);
    expect(requestedComponents(fetchStats, 0)).toEqual([ES_PROD, ES_DEV, UPPERCASE]);
  });

  it('requests the default window, with no registration naming one', async () => {
    const { client, fetchStats } = createClient();
    const { register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(fetchStats.mock.calls[0][0].window).toEqual({ kind: 'default' });
  });

  it('requests a component shown by two registrants once', async () => {
    const { client, fetchStats } = createClient();
    const { register } = startManager({ client });

    register(UPPERCASE, 'slot-a');
    register(UPPERCASE, 'slot-b');
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(requestedComponents(fetchStats, 0)).toEqual([UPPERCASE]);
  });

  it('fetches nothing when nothing is registered', async () => {
    const { client, fetchStats } = createClient();
    startManager({ client });

    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS * 10);

    expect(fetchStats).not.toHaveBeenCalled();
  });
});

describe('one request at a time', () => {
  it('shows a component as loading until its result arrives', async () => {
    const { client } = createClient({ delayMs: 100 });
    const { register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(destinationEntry('es-prod')).toEqual({ status: 'loading' });

    await jest.advanceTimersByTimeAsync(100);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });

  it('leaves a request in flight to finish, and requests a late registration after it', async () => {
    const { client, fetchStats } = createClient({ delayMs: 100 });
    const { register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(fetchStats).toHaveBeenCalledTimes(1);

    // Registered while the first request runs. It must not replace it.
    register(ES_DEV);
    await jest.advanceTimersByTimeAsync(99);
    expect(fetchStats).toHaveBeenCalledTimes(1);
    expect(destinationEntry('es-prod')?.status).toBe('loading');

    // When the first request resolves, the next plan picks up the latecomer without waiting
    // for its own debounce.
    await jest.advanceTimersByTimeAsync(1);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
    expect(fetchStats).toHaveBeenCalledTimes(2);
    expect(requestedComponents(fetchStats, 0)).toEqual([ES_PROD]);
    expect(requestedComponents(fetchStats, 1)).toEqual([ES_DEV]);

    await jest.advanceTimersByTimeAsync(100);
    expect(destinationEntry('es-dev')?.status).toBe('ready');
  });

  it('never has two requests in flight, and still requests everything', async () => {
    const base = createFixtureUnitStatsClient({ scenario: 'data', delayMs: 500 });
    let inFlight = 0;
    let mostInFlight = 0;
    const client: UnitStatsClient = {
      fetchStats: async (request, options) => {
        inFlight += 1;
        mostInFlight = Math.max(mostInFlight, inFlight);
        try {
          return await base.fetchStats(request, options);
        } finally {
          inFlight -= 1;
        }
      },
    };
    const { register, destinationEntry, processorEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    register(ES_DEV);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    register(UPPERCASE);
    await jest.advanceTimersByTimeAsync(5000);

    expect(mostInFlight).toBe(1);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
    expect(destinationEntry('es-dev')?.status).toBe('ready');
    expect(processorEntry('uppercase-message')?.status).toBe('ready');
  });
});

describe('results', () => {
  it('stores the result and when it arrived', async () => {
    const { client } = createClient();
    const { actor, register, destinationEntry, processorEntry } = startManager({ client });

    register(ES_PROD);
    register(UPPERCASE);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(destinationEntry('es-prod')).toMatchObject({
      status: 'ready',
      stats: { eventsRate: 3700 },
    });
    expect(processorEntry('uppercase-message')?.status).toBe('ready');
    expect(actor.getSnapshot().context.lastUpdated).toBeDefined();
  });

  it('keeps the same entry object when a refresh returns equal values', async () => {
    const { client, fetchStats } = createClient();
    const { actor, register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    const first = destinationEntry('es-prod');

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchStats).toHaveBeenCalledTimes(2);
    expect(destinationEntry('es-prod')).toBe(first);
  });

  it('keeps a value on screen while a refresh runs', async () => {
    const { client } = createClient({ delayMs: 100 });
    const { actor, register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    expect(destinationEntry('es-prod')?.status).toBe('ready');

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(50);

    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });

  it('does not fetch again when a component registers inside the freshness period', async () => {
    const { client, fetchStats } = createClient();
    const { register, unregister } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(fetchStats).toHaveBeenCalledTimes(1);

    // A node that is hidden and shown again, for example by a search filter.
    unregister(ES_PROD);
    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(fetchStats).toHaveBeenCalledTimes(1);
  });
});

/** Answers each call from the list in order: a success or a failed request. Later calls succeed. */
const createClientSequence = (steps: Array<'success' | 'failure'>) => {
  const success = createFixtureUnitStatsClient({ scenario: 'data' });
  const failure = createFixtureUnitStatsClient({ scenario: 'requestFailure' });
  let call = 0;
  const client: UnitStatsClient = {
    fetchStats: (request, options) => {
      const step = steps[call];
      call += 1;
      return (step === 'failure' ? failure : success).fetchStats(request, options);
    },
  };
  return { client, calls: () => call };
};

describe('failures', () => {
  it('shows an error for a component that has no value when the request fails', async () => {
    const { client } = createClient({ scenario: 'requestFailure' });
    const { register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(destinationEntry('es-prod')).toEqual({
      status: 'error',
      error: { code: 'request_failed', reason: 'Service Unavailable' },
    });
  });

  it('keeps the value of a component when a refresh fails, and marks it stale', async () => {
    const { client } = createClientSequence(['success', 'failure']);
    const { actor, register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    const fetched = destinationEntry('es-prod');
    expect(fetched?.status).toBe('ready');

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);

    expect(destinationEntry('es-prod')).toEqual({ ...fetched, status: 'stale' });
  });

  it('does not retry on its own after a failure', async () => {
    const { client, fetchStats } = createClient({ scenario: 'requestFailure' });
    const { register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS * 10);

    expect(fetchStats).toHaveBeenCalledTimes(1);
  });

  it('counts failures in a row, and a success resets the count', async () => {
    const { client } = createClientSequence(['failure', 'success']);
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(actor.getSnapshot().context.consecutiveFailures).toBe(1);

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);
    expect(actor.getSnapshot().context.consecutiveFailures).toBe(0);
  });

  it('leaves the request region idle after a failure, so the next request can start', async () => {
    const { client } = createClientSequence(['failure', 'success']);
    const { actor, register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(actor.getSnapshot().matches({ request: 'idle' })).toBe(true);

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });
});

describe('polling', () => {
  const POLL_INTERVAL_MS = 1000;

  it('does not poll when no interval is given', async () => {
    const { client, fetchStats } = createClient();
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS * 20);

    expect(actor.getSnapshot().matches({ polling: 'disabled' })).toBe(true);
    expect(fetchStats).toHaveBeenCalledTimes(1);
  });

  it('asks for every shown component again on each interval', async () => {
    const { client, fetchStats } = createClient();
    const { register } = startManager({ client, pollIntervalMs: POLL_INTERVAL_MS });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    expect(fetchStats).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS - STATS_BATCH_DEBOUNCE_MS);
    expect(fetchStats).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchStats).toHaveBeenCalledTimes(3);
  });

  it('polls nothing when nothing is shown', async () => {
    const { client, fetchStats } = createClient();
    startManager({ client, pollIntervalMs: POLL_INTERVAL_MS });

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(fetchStats).not.toHaveBeenCalled();
  });

  it('leaves a request in flight to finish, even when the interval elapses', async () => {
    const { client, fetchStats } = createClient({ delayMs: 1500 });
    const { register, destinationEntry } = startManager({
      client,
      pollIntervalMs: POLL_INTERVAL_MS,
    });

    register(ES_PROD);
    // The request starts at 300 ms and takes 1500 ms. The poll at 1000 ms must not restart it.
    await jest.advanceTimersByTimeAsync(1500);
    expect(fetchStats).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(300);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });

  it('stops after repeated failures', async () => {
    const { client, fetchStats } = createClient({ scenario: 'requestFailure' });
    const { actor, register } = startManager({ client, pollIntervalMs: POLL_INTERVAL_MS });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 10);

    expect(fetchStats).toHaveBeenCalledTimes(STATS_MAX_CONSECUTIVE_FAILURES);
    expect(actor.getSnapshot().matches({ polling: 'stopped' })).toBe(true);
    expect(actor.getSnapshot().context.consecutiveFailures).toBe(STATS_MAX_CONSECUTIVE_FAILURES);
  });

  it('starts again when the user refreshes after it stopped', async () => {
    const failures = Array.from(
      { length: STATS_MAX_CONSECUTIVE_FAILURES },
      () => 'failure' as const
    );
    const { client, calls } = createClientSequence(failures);
    const { actor, register, destinationEntry } = startManager({
      client,
      pollIntervalMs: POLL_INTERVAL_MS,
    });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 10);
    expect(actor.getSnapshot().matches({ polling: 'stopped' })).toBe(true);
    const callsWhenStopped = calls();

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);

    expect(destinationEntry('es-prod')?.status).toBe('ready');
    expect(actor.getSnapshot().matches({ polling: 'active' })).toBe(true);
    expect(actor.getSnapshot().context.consecutiveFailures).toBe(0);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(calls()).toBeGreaterThan(callsWhenStopped + 1);
  });

  it('still fetches on a registration and on a refresh when polling is off', async () => {
    const { client, fetchStats } = createClient();
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchStats).toHaveBeenCalledTimes(2);
  });

  it('resolves the window again at each poll, so a relative range slides', async () => {
    const { client, fetchStats } = createClient();
    let end = 0;
    const getWindow = (): StatsWindow => {
      end += 1;
      return { kind: 'range', start: 'start', end: `end-${end}` };
    };
    const { register } = startManager({ client, pollIntervalMs: POLL_INTERVAL_MS, getWindow });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);

    const windows = fetchStats.mock.calls.map(([request]) => request.window);
    expect(windows.length).toBeGreaterThanOrEqual(2);
    expect(new Set(windows.map((window) => JSON.stringify(window))).size).toBe(windows.length);
  });
});

describe('refresh', () => {
  it('replaces a request in flight, and aborts it', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    expect(fetchStats).toHaveBeenCalledTimes(1);
    expect(signalOf(fetchStats, 0).aborted).toBe(false);

    actor.send({ type: 'stats.refresh' });

    expect(signalOf(fetchStats, 0).aborted).toBe(true);
    expect(fetchStats).toHaveBeenCalledTimes(2);
    expect(signalOf(fetchStats, 1).aborted).toBe(false);
  });

  it('does nothing when nothing is shown', async () => {
    const { client, fetchStats } = createClient();
    const { actor } = startManager({ client });

    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(fetchStats).not.toHaveBeenCalled();
  });

  it('asks for a fresh value even inside the freshness period', async () => {
    const { client, fetchStats } = createClient();
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    actor.send({ type: 'stats.refresh' });
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchStats).toHaveBeenCalledTimes(2);
  });
});

describe('a change of the window', () => {
  it('clears the values, so the old range is never shown as current, and asks again', async () => {
    const { client, fetchStats } = createClient({ delayMs: 100 });
    const { timeState$, register, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    expect(destinationEntry('es-prod')?.status).toBe('ready');

    timeState$.next({});

    expect(destinationEntry('es-prod')).toEqual({ status: 'loading' });
    expect(fetchStats).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(100);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });

  it('asks for the window that is current at that moment', async () => {
    const { client, fetchStats } = createClient();
    const first: StatsWindow = { kind: 'range', start: 'a', end: 'b' };
    const second: StatsWindow = { kind: 'range', start: 'c', end: 'd' };
    let current = first;
    const { timeState$, register } = startManager({ client, getWindow: () => current });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    current = second;
    timeState$.next({});
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchStats.mock.calls[0][0].window).toEqual(first);
    expect(fetchStats.mock.calls[1][0].window).toEqual(second);
  });

  it('stops the request in flight, because it is for the old window', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { timeState$, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);

    timeState$.next({});

    expect(signalOf(fetchStats, 0).aborted).toBe(true);
    expect(fetchStats).toHaveBeenCalledTimes(2);
  });

  it('drops a cached value that nobody shows', async () => {
    const { client } = createClient();
    const { timeState$, register, unregister, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    unregister(ES_PROD);
    expect(destinationEntry('es-prod')?.status).toBe('ready');

    timeState$.next({});

    expect(destinationEntry('es-prod')).toBeUndefined();
  });

  it('requests nothing when nothing is shown', async () => {
    const { client, fetchStats } = createClient();
    const { timeState$ } = startManager({ client });

    timeState$.next({});
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);

    expect(fetchStats).not.toHaveBeenCalled();
  });
});

describe('a saved unit', () => {
  it('drops the components that are no longer in it', async () => {
    const { client } = createClient();
    const { actor, register, destinationEntry, processorEntry } = startManager({ client });

    register(ES_PROD);
    register(UPPERCASE);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS);
    const kept = destinationEntry('es-prod');

    actor.send({ type: 'stats.unitPersisted', componentIds: ['es-prod'] });

    expect(processorEntry('uppercase-message')).toBeUndefined();
    expect(destinationEntry('es-prod')).toBe(kept);
  });

  it('stops a request that only asked for dropped components', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register } = startManager({ client });

    register(ES_DEV);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);

    actor.send({ type: 'stats.unitPersisted', componentIds: [] });

    expect(signalOf(fetchStats, 0).aborted).toBe(true);
    expect(actor.getSnapshot().matches({ request: 'idle' })).toBe(true);
  });

  it('leaves a request alone when its components are still in the unit', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);

    actor.send({ type: 'stats.unitPersisted', componentIds: ['es-prod'] });

    expect(signalOf(fetchStats, 0).aborted).toBe(false);
    expect(actor.getSnapshot().matches({ request: 'fetching' })).toBe(true);
  });
});

describe('abort', () => {
  it('stops the request when the last component it asked for is unregistered', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register, unregister } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    expect(signalOf(fetchStats, 0).aborted).toBe(false);

    unregister(ES_PROD);

    expect(signalOf(fetchStats, 0).aborted).toBe(true);
    expect(actor.getSnapshot().matches({ request: 'idle' })).toBe(true);
    expect(actor.getSnapshot().context.request.components).toEqual([]);
  });

  it('leaves the request alone while any component it asked for is still shown', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { register, unregister, destinationEntry } = startManager({ client });

    register(ES_PROD);
    register(ES_DEV);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);

    unregister(ES_PROD);
    expect(signalOf(fetchStats, 0).aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(500);
    expect(destinationEntry('es-dev')?.status).toBe('ready');
  });

  it('is not a failure: no error, no failure count, and nothing is retried', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register, unregister, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    unregister(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS * 10);

    expect(actor.getSnapshot().context.consecutiveFailures).toBe(0);
    expect(destinationEntry('es-prod')).toBeUndefined();
    expect(fetchStats).toHaveBeenCalledTimes(1);
  });

  it('lets the next registration request again after an abort', async () => {
    const { client, fetchStats } = createClient({ delayMs: 100 });
    const { register, unregister, destinationEntry } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 50);
    unregister(ES_PROD);

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);

    expect(fetchStats).toHaveBeenCalledTimes(2);
    expect(destinationEntry('es-prod')?.status).toBe('ready');
  });

  it('is stopped with the machine, so no request outlives it', async () => {
    const { client, fetchStats } = createClient({ delayMs: 500 });
    const { actor, register } = startManager({ client });

    register(ES_PROD);
    await jest.advanceTimersByTimeAsync(STATS_BATCH_DEBOUNCE_MS + 100);
    actor.stop();

    expect(signalOf(fetchStats, 0).aborted).toBe(true);
  });
});
