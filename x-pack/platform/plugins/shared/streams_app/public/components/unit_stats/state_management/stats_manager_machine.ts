/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { assign, fromEventObservable, fromPromise, raise, setup } from 'xstate';
import type {
  MappedStatsResponse,
  StatsWindow,
  UnitStatsClient,
} from '../../../services/unit_stats_client/types';
import {
  STATS_BATCH_DEBOUNCE_MS,
  STATS_FRESHNESS_MS,
  STATS_MAX_CONSECUTIVE_FAILURES,
  STATS_POLL_INTERVAL_MS,
} from './constants';
import { isBatchWanted, planBatches } from './stats_batching';
import { markBatchFailed, markBatchLoading, mergeFetchedStats } from './stats_entries';
import { registerComponent, unregisterComponent } from './stats_registration';
import type { StatsBatch, StatsComponents } from './types';

export interface StatsManagerInput {
  /**
   * Resolves the window to fetch. The machine calls it at every flush, so every component in a
   * flush shares one window, and a relative range such as "last 15 minutes" slides with each poll.
   */
  getWindow: () => StatsWindow;
  /**
   * How often to ask for every shown component again. Omit it for no polling: components are then
   * fetched when they register and when the user refreshes.
   */
  pollIntervalMs?: number;
}

export interface StatsManagerContext {
  getWindow: () => StatsWindow;
  pollIntervalMs?: number;
  /** Every component that is shown or cached, by kind and id. */
  components: StatsComponents;
  /**
   * The request in flight, so its result is applied to the components it asked for. It is
   * `NO_REQUEST` while the `request` region is idle.
   */
  request: StatsBatch;
  lastUpdated?: number;
  /** Failed requests in a row. A result resets it. */
  consecutiveFailures: number;
}

/** A request for no components, which stands for "nothing in flight". */
export const NO_REQUEST: StatsBatch = { window: { kind: 'default' }, components: [] };

// Sent by consumers

export interface StatsRegisterEvent {
  type: 'stats.register';
  ref: StreamsUnit.StatsComponentRef;
  /** Who shows the component. The hook makes it, so a repeated event changes nothing. */
  registrant: string;
}

export interface StatsUnregisterEvent {
  type: 'stats.unregister';
  ref: StreamsUnit.StatsComponentRef;
  registrant: string;
}

/** The user asks for fresh values. It also restarts polling after it stopped. */
export interface StatsRefreshEvent {
  type: 'stats.refresh';
}

/** A unit was saved. The ids are every component of the saved unit. */
export interface StatsUnitPersistedEvent {
  type: 'stats.unitPersisted';
  componentIds: string[];
}

// Sent by the environment

/** The shared time state changed. The entries describe the old range, so they are cleared. */
export interface StatsWindowChangedEvent {
  type: 'stats.windowChanged';
}

// Raised by the machine itself

/** Something may be due: the debounce ended, or a request resolved. A request in flight wins. */
export interface StatsFetchDueEvent {
  type: 'stats.fetchDue';
}

/** The poll interval elapsed. It asks for every shown component again. */
export interface StatsPollEvent {
  type: 'stats.poll';
}

export type StatsManagerEvent =
  | StatsRegisterEvent
  | StatsUnregisterEvent
  | StatsRefreshEvent
  | StatsUnitPersistedEvent
  | StatsWindowChangedEvent
  | StatsFetchDueEvent
  | StatsPollEvent;

// Actors

export interface FetchStatsInput {
  batch: StatsBatch;
}

export const toFailureReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs one request. The machine invokes it from the `fetching` state, so leaving that state stops
 * the actor, which aborts the signal and cancels the HTTP call. An abort never reaches the
 * machine as a result.
 */
export const createFetchStatsActor = ({ client }: { client: UnitStatsClient }) =>
  fromPromise<MappedStatsResponse, FetchStatsInput>(({ input: { batch }, signal }) =>
    client.fetchStats({ components: batch.components, window: batch.window }, { signal })
  );

/**
 * Turns a change of the shared time state into an event. A view without a picker, such as the
 * Map, passes an observable that never emits.
 */
export const createTimeUpdatesActor = ({ timeState$ }: { timeState$: Observable<unknown> }) =>
  fromEventObservable(() =>
    timeState$.pipe(map((): StatsWindowChangedEvent => ({ type: 'stats.windowChanged' })))
  );

// Planning

/** A refresh or a poll asks for every shown component again. Any other event asks for what is due. */
const isForcedBy = (event: StatsManagerEvent): boolean =>
  event.type === 'stats.refresh' || event.type === 'stats.poll';

/**
 * The batch to request next, if anything is due. Only the first batch starts. What is left over,
 * such as components that registered while a request was running or the ones over the request
 * limit, stays due, and the machine plans again when the request in flight resolves.
 */
const planNextBatch = (
  { components, getWindow }: StatsManagerContext,
  event: StatsManagerEvent
): StatsBatch | undefined => {
  const [batch] = planBatches(components, getWindow(), {
    now: Date.now(),
    freshnessMs: STATS_FRESHNESS_MS,
    force: isForcedBy(event),
  });
  return batch;
};

// Machine

export const statsManagerMachine = setup({
  types: {
    input: {} as StatsManagerInput,
    context: {} as StatsManagerContext,
    events: {} as StatsManagerEvent,
  },
  actors: {
    fetchStats: getPlaceholderFor(createFetchStatsActor),
    timeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    register: assign(
      ({ context }, params: { ref: StreamsUnit.StatsComponentRef; registrant: string }) => ({
        components: registerComponent(context.components, params.ref, params.registrant),
      })
    ),
    unregister: assign(
      ({ context }, params: { ref: StreamsUnit.StatsComponentRef; registrant: string }) => ({
        components: unregisterComponent(context.components, params.ref, params.registrant),
      })
    ),
    /** Takes the next batch as the request in flight, and marks its components as loading. */
    startRequest: assign(({ context, event }) => {
      const request = planNextBatch(context, event);
      return request ? { request, components: markBatchLoading(context.components, request) } : {};
    }),
    /** Writes the response into the components of the request, and counts as a success. */
    storeResult: assign(({ context }, params: { response: MappedStatsResponse }) => {
      const now = Date.now();
      return {
        components: mergeFetchedStats(context.components, context.request, params.response, now),
        lastUpdated: now,
        consecutiveFailures: 0,
      };
    }),
    /** Marks the components of the request as stale or failed, and counts the failure. */
    storeFailure: assign(({ context }, params: { reason: string }) => ({
      components: markBatchFailed(context.components, context.request, params.reason),
      consecutiveFailures: context.consecutiveFailures + 1,
    })),
    clearRequest: assign({ request: NO_REQUEST }),
    resetFailures: assign({ consecutiveFailures: 0 }),
  },
  guards: {
    pollingEnabled: ({ context }) => context.pollIntervalMs !== undefined,
    tooManyFailures: ({ context }) => context.consecutiveFailures >= STATS_MAX_CONSECUTIVE_FAILURES,
    /** Whether the event that is being handled leaves something to request. */
    hasDueBatch: ({ context, event }) => planNextBatch(context, event) !== undefined,
    /** Whether no shown component wants the request in flight any more. */
    requestUnwanted: ({ context }) => !isBatchWanted(context.components, context.request),
  },
  delays: {
    batchDebounce: STATS_BATCH_DEBOUNCE_MS,
    // Only used while polling is enabled, so the fallback is never reached.
    pollInterval: ({ context }) => context.pollIntervalMs ?? STATS_POLL_INTERVAL_MS,
  },
}).createMachine({
  id: 'statsManager',
  context: ({ input }) => ({
    getWindow: input.getWindow,
    pollIntervalMs: input.pollIntervalMs,
    components: { destination: {}, processor: {} },
    request: NO_REQUEST,
    consecutiveFailures: 0,
  }),
  invoke: { id: 'timeUpdates', src: 'timeUpdates' },
  type: 'parallel',
  on: {
    'stats.unregister': {
      actions: {
        type: 'unregister',
        params: ({ event }) => ({ ref: event.ref, registrant: event.registrant }),
      },
    },
  },
  states: {
    // Joins registrations that arrive close together into one request.
    batching: {
      initial: 'idle',
      on: {
        // Every registration restarts the debounce, so a burst of registrations is one flush.
        'stats.register': {
          target: '.debouncing',
          reenter: true,
          actions: {
            type: 'register',
            params: ({ event }) => ({ ref: event.ref, registrant: event.registrant }),
          },
        },
      },
      states: {
        idle: {},
        debouncing: {
          after: {
            batchDebounce: { target: 'idle', actions: raise({ type: 'stats.fetchDue' }) },
          },
        },
      },
    },
    // Runs one request at a time. Leaving `fetching` stops the request, which aborts the call.
    request: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'stats.fetchDue': { guard: 'hasDueBatch', target: 'fetching' },
            'stats.refresh': { guard: 'hasDueBatch', target: 'fetching' },
            'stats.poll': { guard: 'hasDueBatch', target: 'fetching' },
          },
        },
        fetching: {
          entry: 'startRequest',
          invoke: {
            src: 'fetchStats',
            input: ({ context }) => ({ batch: context.request }),
            onDone: {
              target: 'idle',
              actions: [
                { type: 'storeResult', params: ({ event }) => ({ response: event.output }) },
                'clearRequest',
                // What is left over, such as components that registered meanwhile, is requested next.
                raise({ type: 'stats.fetchDue' }),
              ],
            },
            // Nothing is raised after a failure. The components are still due, and a retry here
            // would loop. The next poll or a refresh retries.
            onError: {
              target: 'idle',
              actions: [
                {
                  type: 'storeFailure',
                  params: ({ event }) => ({ reason: toFailureReason(event.error) }),
                },
                'clearRequest',
              ],
            },
          },
          // No shown component wants the request any more: leaving the state aborts it.
          always: { guard: 'requestUnwanted', target: 'idle', actions: 'clearRequest' },
          on: {
            // `stats.fetchDue` and `stats.poll` are not handled here, so a request in flight is
            // left to finish. Only the user's refresh replaces it. A poll that replaced it would
            // restart a slow request on every tick, and it would never finish.
            'stats.refresh': { guard: 'hasDueBatch', target: 'fetching', reenter: true },
          },
        },
      },
    },
    // Optional. Asks for every shown component again on an interval, and stops after repeated
    // failures until the user refreshes.
    polling: {
      initial: 'checking',
      states: {
        checking: {
          always: [{ guard: 'pollingEnabled', target: 'active' }, { target: 'disabled' }],
        },
        // No interval was given: only a registration or a refresh fetches.
        disabled: {},
        active: {
          after: {
            pollInterval: {
              target: 'active',
              reenter: true,
              actions: raise({ type: 'stats.poll' }),
            },
          },
          always: { guard: 'tooManyFailures', target: 'stopped' },
          on: { 'stats.refresh': { actions: 'resetFailures' } },
        },
        stopped: {
          on: { 'stats.refresh': { target: 'active', actions: 'resetFailures' } },
        },
      },
    },
  },
});
