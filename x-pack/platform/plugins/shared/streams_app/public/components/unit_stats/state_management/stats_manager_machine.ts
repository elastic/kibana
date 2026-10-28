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
import { assign, fromCallback, fromEventObservable, setup } from 'xstate';
import type {
  MappedStatsResponse,
  StatsWindow,
  UnitStatsClient,
} from '../../../services/unit_stats_client/types';
import { STATS_BATCH_DEBOUNCE_MS, STATS_POLL_INTERVAL_MS } from './constants';
import { registerComponent, unregisterComponent } from './stats_registration';
import type { StatsBatch, StatsComponents } from './types';

export interface StatsManagerInput {
  /**
   * Resolves the window to fetch. The machine calls it at every flush, so every component in a
   * flush shares one window, and a relative range such as "last 15 minutes" slides with each poll.
   */
  getWindow: () => StatsWindow;
}

export interface StatsManagerContext {
  getWindow: () => StatsWindow;
  /** Every component that is shown or cached, by kind and id. */
  components: StatsComponents;
  /** The requests in flight by id, so a result is applied to the components it asked for. */
  requests: Record<string, StatsBatch>;
  /** Makes the id of the next request. */
  requestSequence: number;
  lastUpdated?: number;
  /** Failed requests in a row. A result resets it. */
  consecutiveFailures: number;
}

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

// Sent by a fetch actor

export interface StatsFetchDoneEvent {
  type: 'stats.fetch.done';
  requestId: string;
  response: MappedStatsResponse;
}

export interface StatsFetchFailedEvent {
  type: 'stats.fetch.failed';
  requestId: string;
  reason: string;
}

export type StatsManagerEvent =
  | StatsRegisterEvent
  | StatsUnregisterEvent
  | StatsRefreshEvent
  | StatsUnitPersistedEvent
  | StatsWindowChangedEvent
  | StatsFetchDoneEvent
  | StatsFetchFailedEvent;

// Actors

export interface FetchStatsInput {
  requestId: string;
  batch: StatsBatch;
}

const toFailureReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs one request. The machine stops the actor when it no longer wants the result, which runs
 * the cleanup and aborts the request. Nothing is sent after an abort, so an abort is never a failure.
 */
export const createFetchStatsActor = ({ client }: { client: UnitStatsClient }) =>
  fromCallback<StatsFetchDoneEvent | StatsFetchFailedEvent, FetchStatsInput>(
    ({ input: { requestId, batch }, sendBack }) => {
      const controller = new AbortController();

      client
        .fetchStats(
          { components: batch.components, window: batch.window },
          { signal: controller.signal }
        )
        .then((response) => {
          if (controller.signal.aborted) return;
          sendBack({ type: 'stats.fetch.done', requestId, response });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          sendBack({ type: 'stats.fetch.failed', requestId, reason: toFailureReason(error) });
        });

      return () => controller.abort();
    }
  );

/**
 * Turns a change of the shared time state into an event. A view without a picker, such as the
 * Map, passes an observable that never emits.
 */
export const createTimeUpdatesActor = ({ timeState$ }: { timeState$: Observable<unknown> }) =>
  fromEventObservable(() =>
    timeState$.pipe(map((): StatsWindowChangedEvent => ({ type: 'stats.windowChanged' })))
  );

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
  },
  delays: {
    batchDebounce: STATS_BATCH_DEBOUNCE_MS,
    pollInterval: STATS_POLL_INTERVAL_MS,
  },
}).createMachine({
  id: 'statsManager',
  context: ({ input }) => ({
    getWindow: input.getWindow,
    components: { destination: {}, processor: {} },
    requests: {},
    requestSequence: 0,
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
          after: { batchDebounce: 'idle' },
        },
      },
    },
    // Refreshes on an interval, and stops after repeated failures until the user refreshes.
    polling: {
      initial: 'active',
      states: {
        active: {},
      },
    },
  },
});
