/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, fromPromise, sendTo, setup } from 'xstate';
import type { CoreStart } from '@kbn/core/public';
import type { DestinationType } from '../types';
import {
  createDestinationsMachineImplementations,
  destinationsStateMachine,
  type DestinationsActorRef,
} from './destinations_state_machine';
import {
  createDefaultUnit,
  type Unit,
  type UnitRepository,
} from '../../../../services/unit_repository';
import { getFormattedError } from '../../../../util/errors';

export interface DestinationsTableSortingColumn {
  id: string;
  direction: 'asc' | 'desc';
}

export interface DestinationsTablePagination {
  pageIndex: number;
  pageSize: number;
}

export interface DestinationsTableStateInput {
  unitDefinition?: Unit;
  toasts: CoreStart['notifications']['toasts'];
  loadUnitDefinition: UnitRepository['load'];
  persistUnitDefinition: UnitRepository['persist'];
}

export interface DestinationsTableStateContext {
  unitDefinition: Unit;
  pendingUnitDefinition?: Unit;
  pendingDestinationId?: string;
  pendingIntent?: 'create' | 'delete';
  destinationsRef: DestinationsActorRef;
  query: string;
  selectedTypes: DestinationType[];
  sortingColumns: DestinationsTableSortingColumn[];
  pagination: DestinationsTablePagination;
  visibleColumnIds: string[];
  loadUnitDefinition: () => Promise<Unit>;
  persistUnitDefinition: (unitDefinition: Unit) => Promise<Unit>;
  error?: Error;
}

export type DestinationsTableStateEvent =
  | {
      type: 'unit.changed';
      unitDefinition: Unit;
      destinationId: string;
      intent: 'create' | 'delete';
    }
  | { type: 'unit.reload' }
  | { type: 'xstate.done.actor.loadUnitDefinition'; output: Unit }
  | { type: 'xstate.error.actor.loadUnitDefinition'; error: unknown }
  | {
      type: 'xstate.done.actor.persistUnitDefinition';
      output: { unitDefinition: Unit; destinationId: string };
    }
  | { type: 'xstate.error.actor.persistUnitDefinition'; error: unknown }
  | { type: 'search.change'; query: string }
  | { type: 'filters.types.change'; destinationTypes: DestinationType[] }
  | { type: 'sorting.change'; columns: DestinationsTableSortingColumn[] }
  | { type: 'pagination.change'; pagination: DestinationsTablePagination }
  | { type: 'visibleColumns.change'; columnIds: string[] };

export const destinationsTableStateMachine = setup({
  types: {
    input: {} as DestinationsTableStateInput,
    context: {} as DestinationsTableStateContext,
    events: {} as DestinationsTableStateEvent,
  },
  actors: {
    loadUnitDefinition: fromPromise(async ({ input }: { input: () => Promise<Unit> }) => input()),
    persistUnitDefinition: fromPromise(
      async ({
        input,
      }: {
        input: {
          persist: UnitRepository['persist'];
          unitDefinition: Unit;
          destinationId: string;
        };
      }) => ({
        unitDefinition: await input.persist(input.unitDefinition),
        destinationId: input.destinationId,
      })
    ),
  },
  actions: {
    storePendingUnitDefinition: assign({
      pendingUnitDefinition: ({ event }) =>
        event.type === 'unit.changed' ? event.unitDefinition : undefined,
      pendingDestinationId: ({ event }) =>
        event.type === 'unit.changed' ? event.destinationId : undefined,
      pendingIntent: ({ event }) => (event.type === 'unit.changed' ? event.intent : undefined),
      error: undefined,
    }),
    storeLoadedUnitDefinition: assign({
      unitDefinition: ({ context, event }) =>
        event.type === 'xstate.done.actor.loadUnitDefinition'
          ? event.output
          : context.unitDefinition,
      pendingUnitDefinition: undefined,
      pendingDestinationId: undefined,
      pendingIntent: undefined,
      error: undefined,
    }),
    storePersistedUnitDefinition: assign({
      unitDefinition: ({ context, event }) =>
        event.type === 'xstate.done.actor.persistUnitDefinition'
          ? event.output.unitDefinition
          : context.unitDefinition,
      pendingUnitDefinition: undefined,
      pendingDestinationId: undefined,
      pendingIntent: undefined,
      error: undefined,
    }),
    storeFailure: assign({
      error: ({ event }) =>
        event.type === 'xstate.error.actor.loadUnitDefinition' ||
        event.type === 'xstate.error.actor.persistUnitDefinition'
          ? getFormattedError(event.error)
          : undefined,
    }),
    syncLoadedUnitDefinition: sendTo(
      ({ context }) => context.destinationsRef,
      ({ event }) => {
        if (event.type !== 'xstate.done.actor.loadUnitDefinition') {
          throw new Error('Expected a loaded unit definition');
        }
        return {
          type: 'unit.loaded' as const,
          unitDefinition: event.output,
        };
      }
    ),
    syncPersistedUnitDefinition: sendTo(
      ({ context }) => context.destinationsRef,
      ({ event }) => {
        if (event.type !== 'xstate.done.actor.persistUnitDefinition') {
          throw new Error('Expected a persisted unit definition');
        }
        return {
          type: 'unit.persisted' as const,
          destinationId: event.output.destinationId,
          unitDefinition: event.output.unitDefinition,
        };
      }
    ),
    syncPersistenceFailure: sendTo(
      ({ context }) => context.destinationsRef,
      ({ context, event }) => {
        if (event.type !== 'xstate.error.actor.persistUnitDefinition') {
          throw new Error('Expected a unit persistence failure');
        }
        if (!context.pendingDestinationId || !context.pendingIntent) {
          throw new Error('Expected a pending destination mutation');
        }
        return {
          type: 'unit.persistenceFailed' as const,
          destinationId: context.pendingDestinationId,
          unitDefinition: context.unitDefinition,
          message: getFormattedError(event.error).message,
          intent: context.pendingIntent,
        };
      }
    ),
    updateQuery: assign({
      query: ({ context, event }) => (event.type === 'search.change' ? event.query : context.query),
      pagination: ({ context, event }) =>
        event.type === 'search.change'
          ? { ...context.pagination, pageIndex: 0 }
          : context.pagination,
    }),
    updateTypeFilters: assign({
      selectedTypes: ({ context, event }) =>
        event.type === 'filters.types.change' ? event.destinationTypes : context.selectedTypes,
      pagination: ({ context, event }) =>
        event.type === 'filters.types.change'
          ? { ...context.pagination, pageIndex: 0 }
          : context.pagination,
    }),
    updateSorting: assign({
      sortingColumns: ({ context, event }) =>
        event.type === 'sorting.change' ? event.columns : context.sortingColumns,
    }),
    updatePagination: assign({
      pagination: ({ context, event }) =>
        event.type === 'pagination.change' ? event.pagination : context.pagination,
    }),
    updateVisibleColumns: assign({
      visibleColumnIds: ({ context, event }) =>
        event.type === 'visibleColumns.change' ? event.columnIds : context.visibleColumnIds,
    }),
  },
}).createMachine({
  id: 'streamsDestinationsTable',
  context: ({ input, self, spawn }) => {
    const unitDefinition = input.unitDefinition ?? createDefaultUnit();
    return {
      unitDefinition,
      pendingUnitDefinition: undefined,
      pendingDestinationId: undefined,
      pendingIntent: undefined,
      query: '',
      selectedTypes: [],
      sortingColumns: [{ id: 'name', direction: 'asc' as const }],
      pagination: { pageIndex: 0, pageSize: 10 },
      visibleColumnIds: ['name', 'type'],
      loadUnitDefinition: input.loadUnitDefinition,
      persistUnitDefinition: input.persistUnitDefinition,
      error: undefined,
      destinationsRef: spawn(
        destinationsStateMachine.provide(
          createDestinationsMachineImplementations({ toasts: input.toasts })
        ),
        {
          input: {
            unitDefinition,
            includeUnconfiguredNodeOnCreate: false,
            parentRef: self,
          },
        }
      ),
    };
  },
  on: {
    'search.change': { actions: ['updateQuery'] },
    'filters.types.change': { actions: ['updateTypeFilters'] },
    'sorting.change': { actions: ['updateSorting'] },
    'pagination.change': { actions: ['updatePagination'] },
    'visibleColumns.change': { actions: ['updateVisibleColumns'] },
  },
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        id: 'loadUnitDefinition',
        src: 'loadUnitDefinition',
        input: ({ context }) => context.loadUnitDefinition,
        onDone: {
          target: 'ready',
          actions: ['storeLoadedUnitDefinition', 'syncLoadedUnitDefinition'],
        },
        onError: {
          target: 'loadFailed',
          actions: ['storeFailure'],
        },
      },
    },
    loadFailed: {
      on: {
        'unit.reload': { target: 'loading' },
      },
    },
    ready: {
      on: {
        'unit.changed': {
          target: 'persisting',
          actions: ['storePendingUnitDefinition'],
        },
        'unit.reload': { target: 'reloading' },
      },
    },
    reloading: {
      invoke: {
        id: 'loadUnitDefinition',
        src: 'loadUnitDefinition',
        input: ({ context }) => context.loadUnitDefinition,
        onDone: {
          target: 'ready',
          actions: ['storeLoadedUnitDefinition', 'syncLoadedUnitDefinition'],
        },
        onError: {
          target: 'failed',
          actions: ['storeFailure'],
        },
      },
    },
    persisting: {
      on: {
        'unit.changed': {
          target: 'persisting',
          reenter: true,
          actions: ['storePendingUnitDefinition'],
        },
      },
      invoke: {
        id: 'persistUnitDefinition',
        src: 'persistUnitDefinition',
        input: ({ context }) => ({
          persist: context.persistUnitDefinition,
          unitDefinition: context.pendingUnitDefinition ?? context.unitDefinition,
          destinationId: context.pendingDestinationId ?? '',
        }),
        onDone: {
          target: 'ready',
          actions: ['storePersistedUnitDefinition', 'syncPersistedUnitDefinition'],
        },
        onError: {
          target: 'failed',
          actions: ['storeFailure', 'syncPersistenceFailure'],
        },
      },
    },
    failed: {
      on: {
        'unit.changed': {
          target: 'persisting',
          actions: ['storePendingUnitDefinition'],
        },
        'unit.reload': { target: 'reloading' },
      },
    },
  },
});
