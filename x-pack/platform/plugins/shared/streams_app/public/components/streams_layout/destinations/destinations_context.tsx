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
import { createUnitRepository } from '../../../services/unit_repository';
import { canSubmitDestinationForm } from './destination_form';
import type { DestinationNameValidationError } from './destination_helpers';
import {
  getDestinationViewModels,
  type DestinationsActorRef,
  type ResolvedIndicesStatus,
} from './state_machines/destinations_state_machine';
import {
  destinationsTableStateMachine,
  type DestinationsTablePagination,
  type DestinationsTableSortingColumn,
} from './state_machines/destinations_table_state_machine';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  type DestinationCreationFormErrors,
  type DestinationStorageKind,
  type DestinationType,
  type DestinationViewModel,
  type ElasticsearchDestinationFormData,
} from './types';

export interface DestinationsController {
  destinations: DestinationViewModel[];
  resolvedIndicesByDestination: Record<string, ResolvedDestinationIndex[]>;
  resolvedIndicesStatus: ResolvedIndicesStatus;
  resolvedIndicesError?: string;
  query: string;
  selectedDestination?: DestinationViewModel;
  isCreateModalOpen: boolean;
  isRefreshingUnit: boolean;
  storageKind: DestinationStorageKind;
  destinationName: string;
  destinationNameError?: DestinationNameValidationError;
  elasticsearchAuto: boolean;
  elasticsearchLogsIndex: string;
  elasticsearchMetricsIndex: string;
  elasticsearchTracesIndex: string;
  staticIndexesError?: DestinationCreationFormErrors['staticIndexes'];
  logsIndexError?: DestinationCreationFormErrors['logsIndex'];
  metricsIndexError?: DestinationCreationFormErrors['metricsIndex'];
  tracesIndexError?: DestinationCreationFormErrors['tracesIndex'];
  canCreateDestination: boolean;
  isUnitSaving: boolean;
  persistenceError?: string;
  apiKeyError?: string;
  isCreatingDestination: boolean;
  isCreateFailed: boolean;
  refreshUnit: () => void;
  createDestination: () => void;
  setStorageKind: (storageKind: DestinationStorageKind) => void;
  setCreateDestinationName: (destinationName: string) => void;
  setElasticsearchAuto: (auto: boolean) => void;
  setElasticsearchIndexes: (
    indexes: Partial<
      Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
    >
  ) => void;
  validateCreationForm: () => void;
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
  const storageKind = creationContext?.formData.storageKind ?? 'local_elasticsearch';
  const destinationName = creationContext?.formData.destinationName ?? '';
  const destinationNameError = creationContext?.formErrors.destinationName;
  const elasticsearchAuto =
    creationContext?.formData.elasticsearch.auto ?? EMPTY_ELASTICSEARCH_DESTINATION_FORM.auto;
  const elasticsearchLogsIndex =
    creationContext?.formData.elasticsearch.logsIndex ??
    EMPTY_ELASTICSEARCH_DESTINATION_FORM.logsIndex;
  const elasticsearchMetricsIndex =
    creationContext?.formData.elasticsearch.metricsIndex ??
    EMPTY_ELASTICSEARCH_DESTINATION_FORM.metricsIndex;
  const elasticsearchTracesIndex =
    creationContext?.formData.elasticsearch.tracesIndex ??
    EMPTY_ELASTICSEARCH_DESTINATION_FORM.tracesIndex;
  const staticIndexesError = creationContext?.formErrors.staticIndexes;
  const logsIndexError = creationContext?.formErrors.logsIndex;
  const metricsIndexError = creationContext?.formErrors.metricsIndex;
  const tracesIndexError = creationContext?.formErrors.tracesIndex;
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
  const setElasticsearchAuto = useCallback(
    (auto: boolean) => destinationsActorRef.send({ type: 'elasticsearch.change', auto }),
    [destinationsActorRef]
  );
  const setElasticsearchIndexes = useCallback(
    (
      indexes: Partial<
        Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
      >
    ) => destinationsActorRef.send({ type: 'elasticsearch.change', ...indexes }),
    [destinationsActorRef]
  );
  const validateCreationForm = useCallback(
    () => destinationsActorRef.send({ type: 'creationForm.blur' }),
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
      query,
      selectedDestination: destinationViews.find(({ id }) => id === selectedDestinationId),
      isCreateModalOpen,
      isRefreshingUnit,
      storageKind,
      destinationName,
      destinationNameError,
      elasticsearchAuto,
      elasticsearchLogsIndex,
      elasticsearchMetricsIndex,
      elasticsearchTracesIndex,
      staticIndexesError,
      logsIndexError,
      metricsIndexError,
      tracesIndexError,
      canCreateDestination: canCreateDestination && !isUnitSaving,
      isUnitSaving,
      persistenceError,
      apiKeyError,
      isCreatingDestination,
      isCreateFailed,
      refreshUnit: () => {
        tableState?.refreshUnit();
        destinationsActorRef.send({ type: 'resolvedIndices.reload' });
      },
      createDestination,
      setStorageKind,
      setCreateDestinationName,
      setElasticsearchAuto,
      setElasticsearchIndexes,
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
      reloadResolvedIndices,
    }),
    [
      canCreateDestination,
      resolvedIndicesByDestination,
      resolvedIndicesError,
      resolvedIndicesStatus,
      isUnitSaving,
      createDestination,
      deleteDestination,
      destinationName,
      destinationNameError,
      destinationViews,
      elasticsearchAuto,
      elasticsearchLogsIndex,
      elasticsearchMetricsIndex,
      elasticsearchTracesIndex,
      reloadResolvedIndices,
      staticIndexesError,
      logsIndexError,
      metricsIndexError,
      tracesIndexError,
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
      setCreateDestinationName,
      setElasticsearchAuto,
      setElasticsearchIndexes,
      setStorageKind,
      storageKind,
      tableState,
      validateCreationForm,
    ]
  );
};
