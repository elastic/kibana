/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useActorRef, useSelector } from '@xstate/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { createUnitRepository } from '../../../services/unit_repository';
import { canSubmitDestinationForm } from './destination_form';
import type { DestinationNameValidationError } from './destination_helpers';
import {
  getDestinationViewModels,
  type DestinationsActorRef,
} from './state_machines/destinations_state_machine';
import {
  destinationsTableStateMachine,
  type DestinationsTablePagination,
  type DestinationsTableSortingColumn,
} from './state_machines/destinations_table_state_machine';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  type DestinationStorageKind,
  type DestinationType,
  type DestinationViewModel,
} from './types';

export interface DestinationsController {
  destinations: DestinationViewModel[];
  query: string;
  selectedDestination?: DestinationViewModel;
  isCreateModalOpen: boolean;
  isRefreshingUnit: boolean;
  storageKind: DestinationStorageKind;
  destinationName: string;
  destinationNameError?: DestinationNameValidationError;
  elasticsearchIndex: string;
  elasticsearchIndexPatterns: string;
  indexError?: 'required';
  indexPatternsError?: 'required' | 'invalid';
  canCreateDestination: boolean;
  unconfiguredNodeIds: string[];
  persistenceError?: string;
  isCreatingDestination: boolean;
  isCreateFailed: boolean;
  refreshUnit: () => void;
  createDestination: () => void;
  setStorageKind: (storageKind: DestinationStorageKind) => void;
  setCreateDestinationName: (destinationName: string) => void;
  setElasticsearchIndex: (index: string) => void;
  setElasticsearchIndexPatterns: (indexPatterns: string) => void;
  validateCreationForm: () => void;
  deleteDestination: (destinationId: string) => void;
  setQuery: (query: string) => void;
  openCreateModal: (associatedUnconfiguredNodeId?: string) => void;
  closeCreateModal: () => void;
  openDestinationFlyout: (destinationId: string) => void;
  closeDestinationFlyout: () => void;
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
  const unitDefinitionRepository = useMemo(
    () =>
      createUnitRepository({
        streamsRepositoryClient: streams.streamsRepositoryClient,
      }),
    [streams.streamsRepositoryClient]
  );
  const tableActorRef = useActorRef(destinationsTableStateMachine, {
    input: {
      toasts,
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
  const creationContext = useSelector(
    destinationsActorRef,
    (state) => state.context.creationContext
  );
  const unconfiguredNodeIds = useSelector(
    destinationsActorRef,
    (state) => state.context.unconfiguredNodeIds
  );
  const storageKind = creationContext?.formData.storageKind ?? 'local_elasticsearch';
  const destinationName = creationContext?.formData.destinationName ?? '';
  const destinationNameError = creationContext?.formErrors.destinationName;
  const elasticsearchIndex =
    creationContext?.formData.elasticsearch.index ?? EMPTY_ELASTICSEARCH_DESTINATION_FORM.index;
  const elasticsearchIndexPatterns =
    creationContext?.formData.elasticsearch.indexPatterns ??
    EMPTY_ELASTICSEARCH_DESTINATION_FORM.indexPatterns;
  const indexError = creationContext?.formErrors.index;
  const indexPatternsError = creationContext?.formErrors.indexPatterns;
  const isCreatingDestination = useSelector(destinationsActorRef, (state) =>
    state.matches({ configuring: 'persisting' })
  );
  const isCreateFailed = useSelector(destinationsActorRef, (state) =>
    state.matches({ configuring: 'failed' })
  );
  const isCreateModalOpen = useSelector(
    destinationsActorRef,
    (state) => !state.matches({ configuring: 'idle' })
  );
  const canCreateDestination = useSelector(destinationsActorRef, (state) => {
    const creation = state.context.creationContext;
    return Boolean(
      creation &&
        canSubmitDestinationForm({
          formData: creation.formData,
          unitDefinition: state.context.unitDefinition,
        })
    );
  });
  const query = tableState?.query ?? '';
  const isRefreshingUnit = tableState?.isRefreshingUnit ?? false;
  const destinationViews = useSelector(destinationsActorRef, (state) =>
    getDestinationViewModels(state.context)
  );

  const createDestination = useCallback(
    () => destinationsActorRef.send({ type: 'destination.create' }),
    [destinationsActorRef]
  );
  const setStorageKind = useCallback(
    (nextStorageKind: DestinationStorageKind) =>
      destinationsActorRef.send({ type: 'storageKind.select', storageKind: nextStorageKind }),
    [destinationsActorRef]
  );
  const setCreateDestinationName = useCallback(
    (nextDestinationName: string) =>
      destinationsActorRef.send({
        type: 'destinationName.change',
        destinationName: nextDestinationName,
      }),
    [destinationsActorRef]
  );
  const setElasticsearchIndex = useCallback(
    (index: string) => destinationsActorRef.send({ type: 'elasticsearch.change', index }),
    [destinationsActorRef]
  );
  const setElasticsearchIndexPatterns = useCallback(
    (indexPatterns: string) =>
      destinationsActorRef.send({ type: 'elasticsearch.change', indexPatterns }),
    [destinationsActorRef]
  );
  const validateCreationForm = useCallback(
    () => destinationsActorRef.send({ type: 'creationForm.blur' }),
    [destinationsActorRef]
  );
  const openCreateModal = useCallback(
    (associatedUnconfiguredNodeId?: string) =>
      destinationsActorRef.send({ type: 'modal.openCreate', associatedUnconfiguredNodeId }),
    [destinationsActorRef]
  );
  const deleteDestination = useCallback(
    (destinationId: string) =>
      destinationsActorRef.send({ type: 'destination.delete', destinationId }),
    [destinationsActorRef]
  );

  return useMemo(
    () => ({
      destinations: destinationViews,
      query,
      selectedDestination: destinationViews.find(({ id }) => id === selectedDestinationId),
      isCreateModalOpen,
      isRefreshingUnit,
      storageKind,
      destinationName,
      destinationNameError,
      elasticsearchIndex,
      elasticsearchIndexPatterns,
      indexError,
      indexPatternsError,
      canCreateDestination,
      unconfiguredNodeIds,
      persistenceError,
      isCreatingDestination,
      isCreateFailed,
      refreshUnit: () => {
        tableState?.refreshUnit();
      },
      createDestination,
      setStorageKind,
      setCreateDestinationName,
      setElasticsearchIndex,
      setElasticsearchIndexPatterns,
      validateCreationForm,
      deleteDestination,
      setQuery: (nextQuery: string) => {
        tableState?.setQuery(nextQuery);
      },
      openCreateModal,
      closeCreateModal: () => destinationsActorRef.send({ type: 'modal.closeCreate' }),
      openDestinationFlyout: (destinationId: string) =>
        destinationsActorRef.send({ type: 'destination.view', destinationId }),
      closeDestinationFlyout: () => destinationsActorRef.send({ type: 'flyout.close' }),
    }),
    [
      canCreateDestination,
      createDestination,
      deleteDestination,
      destinationName,
      destinationNameError,
      destinationViews,
      elasticsearchIndex,
      elasticsearchIndexPatterns,
      indexError,
      indexPatternsError,
      destinationsActorRef,
      isCreateFailed,
      isCreateModalOpen,
      isCreatingDestination,
      isRefreshingUnit,
      openCreateModal,
      persistenceError,
      query,
      selectedDestinationId,
      setCreateDestinationName,
      setElasticsearchIndex,
      setElasticsearchIndexPatterns,
      setStorageKind,
      storageKind,
      tableState,
      unconfiguredNodeIds,
      validateCreationForm,
    ]
  );
};
