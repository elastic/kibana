/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useActorRef, useSelector } from '@xstate/react';
import { i18n } from '@kbn/i18n';
import { STREAMS_DEFAULT_UNIT_ID, type ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { createUnitRepository, type Unit } from '../../../services/unit_repository';
import {
  getDestinationViewModels,
  type DestinationsActorRef,
  type ResolvedIndicesStatus,
} from './state_machines/destinations_state_machine';
import type { DestinationIndexStats } from './destination_index_stats';
import {
  selectIndexStats,
  selectIndexStatsStatus,
  type DestinationDetailActorRef,
  type DestinationIndexStatsStatus,
} from './state_machines/destination_detail_state_machine';
import {
  destinationsTableStateMachine,
  type DestinationsTablePagination,
  type DestinationsTableSortingColumn,
} from './state_machines/destinations_table_state_machine';
import type { DestinationCreationFormData, DestinationType, DestinationViewModel } from './types';

export interface DestinationsController {
  destinations: DestinationViewModel[];
  resolvedIndicesByDestination: ReadonlyMap<string, ResolvedDestinationIndex[]>;
  resolvedIndicesStatus: ResolvedIndicesStatus;
  resolvedIndicesError?: string;
  /** Only destinations whose details were shown. */
  destinationDetailRefs: ReadonlyMap<string, DestinationDetailActorRef>;
  showDestinationDetail: (destinationId: string, viewerId: string) => void;
  hideDestinationDetail: (destinationId: string, viewerId: string) => void;
  query: string;
  selectedDestination?: DestinationViewModel;
  isCreateModalOpen: boolean;
  isRefreshingUnit: boolean;
  /** The unit new destinations are validated against. */
  unitDefinition: Unit;
  isUnitSaving: boolean;
  persistenceError?: string;
  apiKeyError?: string;
  isCreatingDestination: boolean;
  isCreateFailed: boolean;
  refreshUnit: () => void;
  createDestination: (formData: DestinationCreationFormData) => void;
  deleteDestination: (destinationId: string) => void;
  setQuery: (query: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDestinationFlyout: (destinationId: string) => void;
  closeDestinationFlyout: () => void;
  reloadResolvedIndices: () => void;
}

export interface DestinationsTableController extends DestinationsController {
  selectedTypes: DestinationType[];
  sortingColumns: DestinationsTableSortingColumn[];
  pagination: DestinationsTablePagination;
  visibleColumnIds: string[];
  isLoadingUnit: boolean;
  isUnitUnavailable: boolean;
  setSelectedTypes: (types: DestinationType[]) => void;
  setSortingColumns: (columns: DestinationsTableSortingColumn[]) => void;
  setPagination: (pagination: DestinationsTablePagination) => void;
  setVisibleColumnIds: (columnIds: string[]) => void;
}

interface DestinationsTableState {
  query: string;
  isRefreshingUnit: boolean;
  setQuery: (query: string) => void;
  refreshUnit: () => void;
}

export const useDestinationsTable = (): DestinationsTableController => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: { streams },
    },
  } = useKibana();
  const { timeState, timeState$ } = useTimefilter();
  const unitDefinitionRepository = useMemo(
    () =>
      createUnitRepository({
        streamsRepositoryClient: streams.streamsRepositoryClient,
        toasts,
      }),
    [streams.streamsRepositoryClient, toasts]
  );
  const tableActorRef = useActorRef(destinationsTableStateMachine, {
    input: {
      toasts,
      apiKeyGenerationDeps: {
        streamsRepositoryClient: streams.streamsRepositoryClient,
        unitId: STREAMS_DEFAULT_UNIT_ID,
      },
      timeState,
      timeState$,
      loadUnitDefinition: unitDefinitionRepository.load,
      persistUnitDefinition: unitDefinitionRepository.persist,
    },
  });
  const destinationsActorRef = useSelector(tableActorRef, (state) => state.context.destinationsRef);
  const query = useSelector(tableActorRef, (state) => state.context.query);
  const isRefreshingUnit = useSelector(tableActorRef, (state) => state.matches('reloading'));
  const selectedTypes = useSelector(tableActorRef, (state) => state.context.selectedTypes);
  const sortingColumns = useSelector(tableActorRef, (state) => state.context.sortingColumns);
  const pagination = useSelector(tableActorRef, (state) => state.context.pagination);
  const visibleColumnIds = useSelector(tableActorRef, (state) => state.context.visibleColumnIds);
  const error = useSelector(tableActorRef, (state) => state.context.error);
  const isLoadingUnit = useSelector(tableActorRef, (state) => state.matches('loading'));
  const isUnitUnavailable = useSelector(tableActorRef, (state) => state.matches('loadFailed'));

  useEffect(() => {
    if (error) {
      toasts.addError(error, {
        title: i18n.translate('xpack.streams.destinations.unitRequestFailedTitle', {
          defaultMessage: 'Could not update destinations',
        }),
      });
    }
  }, [error, toasts]);

  const destinationsController = useDestinations({
    destinationsActorRef,
    tableState: {
      query,
      isRefreshingUnit,
      setQuery: (nextQuery) => tableActorRef.send({ type: 'search.change', query: nextQuery }),
      refreshUnit: () => tableActorRef.send({ type: 'unit.reload' }),
    },
  });

  return useMemo(
    () => ({
      ...destinationsController,
      selectedTypes,
      sortingColumns,
      pagination,
      visibleColumnIds,
      isLoadingUnit,
      isUnitUnavailable,
      setSelectedTypes: (destinationTypes: DestinationType[]) =>
        tableActorRef.send({ type: 'filters.types.change', destinationTypes }),
      setSortingColumns: (columns: DestinationsTableSortingColumn[]) =>
        tableActorRef.send({ type: 'sorting.change', columns }),
      setPagination: (nextPagination: DestinationsTablePagination) =>
        tableActorRef.send({ type: 'pagination.change', pagination: nextPagination }),
      setVisibleColumnIds: (columnIds: string[]) =>
        tableActorRef.send({ type: 'visibleColumns.change', columnIds }),
    }),
    [
      destinationsController,
      isLoadingUnit,
      isUnitUnavailable,
      pagination,
      selectedTypes,
      sortingColumns,
      tableActorRef,
      visibleColumnIds,
    ]
  );
};

export const useDestinations = ({
  destinationsActorRef,
  tableState,
}: {
  destinationsActorRef: DestinationsActorRef;
  tableState?: DestinationsTableState;
}): DestinationsController => {
  const selectedDestinationId = useSelector(
    destinationsActorRef,
    (state) => state.context.selectedDestinationId
  );
  const persistenceError = useSelector(
    destinationsActorRef,
    (state) => state.context.persistenceError
  );
  const unitDefinition = useSelector(destinationsActorRef, (state) => state.context.unitDefinition);
  const apiKeyError = useSelector(destinationsActorRef, (state) => state.context.apiKeyError);
  const isCreatingDestination = useSelector(
    destinationsActorRef,
    (state) =>
      state.matches({ configuring: 'persisting' }) ||
      state.matches({ configuring: 'mintingApiKey' })
  );
  const isCreateFailed = useSelector(destinationsActorRef, (state) =>
    state.matches({ configuring: 'failed' })
  );
  const isCreateModalOpen = useSelector(
    destinationsActorRef,
    (state) => !state.matches({ configuring: 'idle' })
  );
  const isUnitSaving = useSelector(destinationsActorRef, (state) =>
    state.matches({ unitSave: 'saving' })
  );
  const query = tableState?.query ?? '';
  const isRefreshingUnit = tableState?.isRefreshingUnit ?? false;
  const destinationViews = useSelector(destinationsActorRef, (state) =>
    getDestinationViewModels(state.context)
  );
  const resolvedIndicesByDestination = useSelector(
    destinationsActorRef,
    (state) => state.context.resolvedIndicesByDestination
  );
  const resolvedIndicesError = useSelector(
    destinationsActorRef,
    (state) => state.context.resolvedIndicesError
  );
  const resolvedIndicesStatus = useSelector(
    destinationsActorRef,
    (state): ResolvedIndicesStatus => {
      if (state.matches({ resolvedIndices: 'loading' })) {
        return 'loading';
      }
      if (state.matches({ resolvedIndices: 'unavailable' })) {
        return 'unavailable';
      }
      return 'ready';
    }
  );

  const destinationDetailRefs = useSelector(
    destinationsActorRef,
    (state) => state.context.destinationDetailRefs
  );
  const showDestinationDetail = useCallback(
    (destinationId: string, viewerId: string) =>
      destinationsActorRef.send({ type: 'destinationDetail.show', destinationId, viewerId }),
    [destinationsActorRef]
  );
  const hideDestinationDetail = useCallback(
    (destinationId: string, viewerId: string) =>
      destinationsActorRef.send({ type: 'destinationDetail.hide', destinationId, viewerId }),
    [destinationsActorRef]
  );

  const createDestination = useCallback(
    (formData: DestinationCreationFormData) =>
      destinationsActorRef.send({ type: 'destination.create', formData }),
    [destinationsActorRef]
  );
  const openCreateModal = useCallback(
    () => destinationsActorRef.send({ type: 'modal.openCreate' }),
    [destinationsActorRef]
  );
  const deleteDestination = useCallback(
    (destinationId: string) =>
      destinationsActorRef.send({ type: 'destination.delete', destinationId }),
    [destinationsActorRef]
  );
  const reloadResolvedIndices = useCallback(
    () => destinationsActorRef.send({ type: 'resolvedIndices.reload' }),
    [destinationsActorRef]
  );

  return useMemo(
    () => ({
      destinations: destinationViews,
      resolvedIndicesByDestination,
      resolvedIndicesStatus,
      resolvedIndicesError,
      destinationDetailRefs,
      showDestinationDetail,
      hideDestinationDetail,
      query,
      selectedDestination: destinationViews.find(({ id }) => id === selectedDestinationId),
      isCreateModalOpen,
      isRefreshingUnit,
      unitDefinition,
      isUnitSaving,
      persistenceError,
      apiKeyError,
      isCreatingDestination,
      isCreateFailed,
      refreshUnit: () => {
        if (tableState) {
          tableState.refreshUnit();
        } else {
          destinationsActorRef.send({ type: 'resolvedIndices.reload' });
        }
      },
      createDestination,
      deleteDestination,
      setQuery: (nextQuery: string) => {
        tableState?.setQuery(nextQuery);
      },
      openCreateModal,
      closeCreateModal: () => destinationsActorRef.send({ type: 'modal.closeCreate' }),
      openDestinationFlyout: (destinationId: string) =>
        destinationsActorRef.send({ type: 'destination.view', destinationId }),
      closeDestinationFlyout: () => destinationsActorRef.send({ type: 'flyout.close' }),
      reloadResolvedIndices,
    }),
    [
      destinationDetailRefs,
      showDestinationDetail,
      hideDestinationDetail,
      resolvedIndicesByDestination,
      resolvedIndicesError,
      resolvedIndicesStatus,
      isUnitSaving,
      createDestination,
      deleteDestination,
      destinationViews,
      reloadResolvedIndices,
      destinationsActorRef,
      isCreateFailed,
      isCreateModalOpen,
      isCreatingDestination,
      isRefreshingUnit,
      openCreateModal,
      persistenceError,
      query,
      selectedDestinationId,
      apiKeyError,
      tableState,
      unitDefinition,
    ]
  );
};

/** Index stats of one destination; loading until its detail actor exists. */
export const useDestinationIndexStats = (
  destinationDetailRef: DestinationDetailActorRef | undefined
): { stats?: DestinationIndexStats; status: DestinationIndexStatsStatus } => ({
  stats: useSelector(destinationDetailRef, selectIndexStats),
  status: useSelector(destinationDetailRef, selectIndexStatsStatus),
});
