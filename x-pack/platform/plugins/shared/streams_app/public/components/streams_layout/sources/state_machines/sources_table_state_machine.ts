/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, fromPromise, sendTo, setup } from 'xstate';
import type { CoreStart } from '@kbn/core/public';
import type {
  SourceRuntimeMetadata,
  SourceStatus,
  SourcesUnitDefinition,
  SourceType,
} from '../types';
import {
  createSourcesMachineImplementations,
  sourcesStateMachine,
  type SourcesActorRef,
} from './sources_state_machine';
import type { SourceApiKeyGenerationDeps } from '../source_api_keys';
import type { SourceEnvironmentLoader } from '../source_environment';
import {
  createEmptyUnitDefinition,
  mockUnitDefinitionRepository,
  type UnitDefinitionRepository,
} from '../unit_definition_repository';

export interface SourcesTableSortingColumn {
  id: string;
  direction: 'asc' | 'desc';
}

export interface SourcesTablePagination {
  pageIndex: number;
  pageSize: number;
}

export interface SourcesTableStateInput {
  unitDefinition?: SourcesUnitDefinition;
  metadataBySourceId?: Record<string, SourceRuntimeMetadata>;
  apiKeyGenerationDeps: SourceApiKeyGenerationDeps;
  toasts: CoreStart['notifications']['toasts'];
  loadSourceEnvironment?: SourceEnvironmentLoader;
  loadUnitDefinition?: UnitDefinitionRepository['load'];
  persistUnitDefinition?: UnitDefinitionRepository['persist'];
}

export interface SourcesTableStateContext {
  unitDefinition: SourcesUnitDefinition;
  pendingUnitDefinition?: SourcesUnitDefinition;
  pendingSourceId?: string;
  pendingIntent?: 'create' | 'delete';
  sourcesRef: SourcesActorRef;
  query: string;
  selectedSourceIds: string[];
  selectedTypes: SourceType[];
  selectedStatuses: SourceStatus[];
  sortingColumns: SourcesTableSortingColumn[];
  pagination: SourcesTablePagination;
  visibleColumnIds: string[];
  loadUnitDefinition: () => Promise<SourcesUnitDefinition>;
  persistUnitDefinition: (unitDefinition: SourcesUnitDefinition) => Promise<SourcesUnitDefinition>;
  error?: Error;
}

export type SourcesTableStateEvent =
  | {
      type: 'unit.changed';
      unitDefinition: SourcesUnitDefinition;
      sourceId: string;
      intent: 'create' | 'delete';
    }
  | { type: 'unit.reload' }
  | { type: 'xstate.done.actor.loadUnitDefinition'; output: SourcesUnitDefinition }
  | { type: 'xstate.error.actor.loadUnitDefinition'; error: unknown }
  | {
      type: 'xstate.done.actor.persistUnitDefinition';
      output: { unitDefinition: SourcesUnitDefinition; sourceId: string };
    }
  | { type: 'xstate.error.actor.persistUnitDefinition'; error: unknown }
  | { type: 'search.change'; query: string }
  | { type: 'selection.change'; sourceIds: string[] }
  | { type: 'filters.types.change'; sourceTypes: SourceType[] }
  | { type: 'filters.statuses.change'; statuses: SourceStatus[] }
  | { type: 'sorting.change'; columns: SourcesTableSortingColumn[] }
  | { type: 'pagination.change'; pagination: SourcesTablePagination }
  | { type: 'visibleColumns.change'; columnIds: string[] };

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('The unit definition request failed.');

export const sourcesTableStateMachine = setup({
  types: {
    input: {} as SourcesTableStateInput,
    context: {} as SourcesTableStateContext,
    events: {} as SourcesTableStateEvent,
  },
  actors: {
    loadUnitDefinition: fromPromise(
      async ({ input }: { input: () => Promise<SourcesUnitDefinition> }) => input()
    ),
    persistUnitDefinition: fromPromise(
      async ({
        input,
      }: {
        input: {
          persist: UnitDefinitionRepository['persist'];
          unitDefinition: SourcesUnitDefinition;
          sourceId: string;
        };
      }) => ({
        unitDefinition: await input.persist(input.unitDefinition),
        sourceId: input.sourceId,
      })
    ),
  },
  actions: {
    storePendingUnitDefinition: assign({
      pendingUnitDefinition: ({ event }) =>
        event.type === 'unit.changed' ? event.unitDefinition : undefined,
      pendingSourceId: ({ event }) => (event.type === 'unit.changed' ? event.sourceId : undefined),
      pendingIntent: ({ event }) => (event.type === 'unit.changed' ? event.intent : undefined),
      error: undefined,
    }),
    storeLoadedUnitDefinition: assign({
      unitDefinition: ({ context, event }) =>
        event.type === 'xstate.done.actor.loadUnitDefinition'
          ? event.output
          : context.unitDefinition,
      pendingUnitDefinition: undefined,
      pendingSourceId: undefined,
      pendingIntent: undefined,
      selectedSourceIds: ({ context, event }) => {
        if (event.type !== 'xstate.done.actor.loadUnitDefinition') {
          return context.selectedSourceIds;
        }
        const loadedSourceIds = new Set(event.output.sources.map(({ id }) => id));
        return context.selectedSourceIds.filter((sourceId) => loadedSourceIds.has(sourceId));
      },
      error: undefined,
    }),
    storePersistedUnitDefinition: assign({
      unitDefinition: ({ context, event }) =>
        event.type === 'xstate.done.actor.persistUnitDefinition'
          ? event.output.unitDefinition
          : context.unitDefinition,
      pendingUnitDefinition: undefined,
      pendingSourceId: undefined,
      pendingIntent: undefined,
      error: undefined,
    }),
    storeFailure: assign({
      error: ({ event }) =>
        event.type === 'xstate.error.actor.loadUnitDefinition' ||
        event.type === 'xstate.error.actor.persistUnitDefinition'
          ? toError(event.error)
          : undefined,
    }),
    syncLoadedUnitDefinition: sendTo(
      ({ context }) => context.sourcesRef,
      ({ event }) => {
        if (event.type !== 'xstate.done.actor.loadUnitDefinition') {
          throw new Error('Expected a loaded unit definition');
        }
        return {
          type: 'unit.loaded',
          unitDefinition: event.output,
        };
      }
    ),
    syncPersistedUnitDefinition: sendTo(
      ({ context }) => context.sourcesRef,
      ({ event }) => {
        if (event.type !== 'xstate.done.actor.persistUnitDefinition') {
          throw new Error('Expected a persisted unit definition');
        }
        return {
          type: 'unit.persisted',
          sourceId: event.output.sourceId,
          unitDefinition: event.output.unitDefinition,
        };
      }
    ),
    syncPersistenceFailure: sendTo(
      ({ context }) => context.sourcesRef,
      ({ context, event }) => {
        if (event.type !== 'xstate.error.actor.persistUnitDefinition') {
          throw new Error('Expected a unit persistence failure');
        }
        if (!context.pendingSourceId || !context.pendingIntent) {
          throw new Error('Expected a pending source mutation');
        }
        return {
          type: 'unit.persistenceFailed',
          sourceId: context.pendingSourceId,
          unitDefinition: context.unitDefinition,
          message: toError(event.error).message,
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
    updateSelection: assign({
      selectedSourceIds: ({ context, event }) =>
        event.type === 'selection.change' ? event.sourceIds : context.selectedSourceIds,
    }),
    updateTypeFilters: assign({
      selectedTypes: ({ context, event }) =>
        event.type === 'filters.types.change' ? event.sourceTypes : context.selectedTypes,
      pagination: ({ context, event }) =>
        event.type === 'filters.types.change'
          ? { ...context.pagination, pageIndex: 0 }
          : context.pagination,
    }),
    updateStatusFilters: assign({
      selectedStatuses: ({ context, event }) =>
        event.type === 'filters.statuses.change' ? event.statuses : context.selectedStatuses,
      pagination: ({ context, event }) =>
        event.type === 'filters.statuses.change'
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
  id: 'streamsSourcesTable',
  context: ({ input, self, spawn }) => {
    const unitDefinition = input.unitDefinition ?? createEmptyUnitDefinition();
    return {
      unitDefinition,
      pendingUnitDefinition: undefined,
      pendingSourceId: undefined,
      pendingIntent: undefined,
      query: '',
      selectedSourceIds: [],
      selectedTypes: [],
      selectedStatuses: [],
      sortingColumns: [{ id: 'name', direction: 'asc' }],
      pagination: { pageIndex: 0, pageSize: 10 },
      visibleColumnIds: ['name', 'type', 'status', 'throughput', 'lastEvent', 'destinations'],
      loadUnitDefinition: input.loadUnitDefinition ?? mockUnitDefinitionRepository.load,
      persistUnitDefinition: input.persistUnitDefinition ?? mockUnitDefinitionRepository.persist,
      error: undefined,
      sourcesRef: spawn(
        sourcesStateMachine.provide(
          createSourcesMachineImplementations({
            apiKeyGenerationDeps: input.apiKeyGenerationDeps,
            toasts: input.toasts,
            loadSourceEnvironment: input.loadSourceEnvironment,
          })
        ),
        {
          input: {
            unitDefinition,
            metadataBySourceId: input.metadataBySourceId ?? {},
            includeUnconfiguredNodeOnCreate: false,
            parentRef: self,
          },
        }
      ),
    };
  },
  on: {
    'search.change': { actions: ['updateQuery'] },
    'selection.change': { actions: ['updateSelection'] },
    'filters.types.change': { actions: ['updateTypeFilters'] },
    'filters.statuses.change': { actions: ['updateStatusFilters'] },
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
          sourceId: context.pendingSourceId ?? '',
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
