/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import { assign, fromPromise, setup } from 'xstate';
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import type { DestinationApiKeyGenerationDeps } from '../destination_api_keys';
import {
  getReadableFailureStoreNames,
  loadDestinationIndexStats,
  type DestinationIndexStats,
  type DestinationIndexStatsTimeRange,
} from '../destination_index_stats';

export type DestinationIndexStatsStatus = 'loading' | 'ready' | 'failed';

export interface DestinationDetailInput {
  destinationId: string;
  /** Omitted while the parent is still resolving indices. */
  indices?: ResolvedDestinationIndex[];
}

export interface DestinationDetailContext {
  destinationId: string;
  indices?: ResolvedDestinationIndex[];
  /** Set by the first stats request; reused when indices reload. */
  indexStatsTimeRange?: DestinationIndexStatsTimeRange;
  indexStats?: DestinationIndexStats;
}

export type DestinationDetailEvent =
  | { type: 'indices.reset' }
  | { type: 'indices.update'; indices: ResolvedDestinationIndex[] }
  | { type: 'indexStats.request'; timeRange: DestinationIndexStatsTimeRange }
  | { type: 'xstate.done.actor.loadIndexStats'; output: DestinationIndexStats }
  | { type: 'xstate.error.actor.loadIndexStats'; error: unknown };

export interface LoadIndexStatsInput {
  dataStreamNames: string[];
  failureStoreNames: string[];
  timeRange: DestinationIndexStatsTimeRange;
}

/** Details of one destination, loaded only while something displays them. */
export const destinationDetailStateMachine = setup({
  types: {
    input: {} as DestinationDetailInput,
    context: {} as DestinationDetailContext,
    events: {} as DestinationDetailEvent,
  },
  actors: {
    loadIndexStats: getPlaceholderFor(createLoadIndexStatsActor),
  },
  actions: {
    storeIndices: assign(({ event }) =>
      event.type === 'indices.update' ? { indices: event.indices } : {}
    ),
    resetIndices: assign({ indices: undefined }),
    storeIndexStatsTimeRange: assign(({ event }) =>
      event.type === 'indexStats.request' ? { indexStatsTimeRange: event.timeRange } : {}
    ),
    clearIndexStats: assign({ indexStats: undefined }),
    storeIndexStats: assign(({ event }) =>
      event.type === 'xstate.done.actor.loadIndexStats' ? { indexStats: event.output } : {}
    ),
  },
  guards: {
    hasIndices: ({ context }) => context.indices !== undefined,
    hasRequestedIndexStats: ({ context }) => context.indexStatsTimeRange !== undefined,
    shouldRequestIndexStats: ({ context, event }) => {
      if (event.type !== 'indexStats.request') {
        return false;
      }
      const isNewTimeRange =
        context.indexStatsTimeRange?.start !== event.timeRange.start ||
        context.indexStatsTimeRange?.end !== event.timeRange.end;
      const hasPartialFailure =
        context.indexStats !== undefined &&
        Object.values(context.indexStats).some((value) => value === undefined);
      return isNewTimeRange || hasPartialFailure;
    },
  },
}).createMachine({
  id: 'destinationDetail',
  type: 'parallel',
  context: ({ input }) => ({
    destinationId: input.destinationId,
    indices: input.indices,
  }),
  states: {
    indexStats: {
      initial: 'idle',
      on: {
        'indexStats.request': {
          guard: 'shouldRequestIndexStats',
          target: '.pending',
          actions: 'storeIndexStatsTimeRange',
        },
        'indices.reset': [
          { guard: 'hasRequestedIndexStats', target: '.pending', actions: 'resetIndices' },
          { actions: 'resetIndices' },
        ],
        'indices.update': [
          { guard: 'hasRequestedIndexStats', target: '.pending', actions: 'storeIndices' },
          { actions: 'storeIndices' },
        ],
      },
      states: {
        idle: {},
        // Indices decide which data streams and failure stores are queried.
        pending: {
          entry: 'clearIndexStats',
          always: { guard: 'hasIndices', target: 'loading' },
        },
        loading: {
          invoke: {
            id: 'loadIndexStats',
            src: 'loadIndexStats',
            input: ({ context }): LoadIndexStatsInput => {
              const indices = context.indices ?? [];
              if (!context.indexStatsTimeRange) {
                throw new Error('Expected an index stats time range');
              }
              return {
                timeRange: context.indexStatsTimeRange,
                dataStreamNames: indices.flatMap((index) =>
                  index.is_data_stream ? [index.name] : []
                ),
                failureStoreNames: getReadableFailureStoreNames(indices),
              };
            },
            onDone: { target: 'ready', actions: 'storeIndexStats' },
            onError: { target: 'failed' },
          },
        },
        ready: {},
        failed: {
          on: {
            'indexStats.request': { target: 'pending', actions: 'storeIndexStatsTimeRange' },
          },
        },
      },
    },
  },
});

export type DestinationDetailActorRef = ActorRefFrom<typeof destinationDetailStateMachine>;
type DestinationDetailSnapshot = SnapshotFrom<typeof destinationDetailStateMachine>;

export const selectIndexStats = (
  snapshot: DestinationDetailSnapshot | undefined
): DestinationIndexStats | undefined => snapshot?.context.indexStats;

export const selectIndexStatsStatus = (
  snapshot: DestinationDetailSnapshot | undefined
): DestinationIndexStatsStatus => {
  if (snapshot?.matches({ indexStats: 'ready' })) {
    return 'ready';
  }
  if (snapshot?.matches({ indexStats: 'failed' })) {
    return 'failed';
  }
  return 'loading';
};

function createLoadIndexStatsActor({
  streamsRepositoryClient,
}: Pick<DestinationApiKeyGenerationDeps, 'streamsRepositoryClient'>) {
  return fromPromise(
    async ({
      input,
      signal,
    }: {
      input: LoadIndexStatsInput;
      signal: AbortSignal;
    }): Promise<DestinationIndexStats> =>
      loadDestinationIndexStats({ streamsRepositoryClient, ...input, signal })
  );
}

export const createDestinationDetailMachineImplementations = (
  deps: Pick<DestinationApiKeyGenerationDeps, 'streamsRepositoryClient'>
): MachineImplementationsFrom<typeof destinationDetailStateMachine> => ({
  actors: {
    loadIndexStats: createLoadIndexStatsActor(deps),
  },
});
