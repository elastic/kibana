/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useActorRef, useSelector } from '@xstate/react';
import { i18n } from '@kbn/i18n';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import type { SourceApiKeyGenerationDeps } from './source_api_keys';
import { createSourceEnvironmentLoader, type SourceEnvironmentLoader } from './source_environment';
import type { SourceApiKeyPrivileges } from './source_api_keys';
import type { SourceSignal } from './source_models';
import type { RevealedApiKey, SourceType, SourceViewModel } from './types';
import {
  getSourceViewModels,
  type SourceNameValidationError,
  type SourcesActorRef,
} from './state_machines/sources_state_machine';
import {
  sourcesTableStateMachine,
  type SourcesTablePagination,
  type SourcesTableSortingColumn,
} from './state_machines/sources_table_state_machine';
import { createUnitRepository } from '../../../services/unit_repository';

export interface SourcesController {
  sources: SourceViewModel[];
  query: string;
  selectedSource?: SourceViewModel;
  selectedSources: SourceViewModel[];
  isCreateModalOpen: boolean;
  isRefreshingUnit: boolean;
  sourceType: SourceType;
  availableSourceTypes: SourceType[];
  sourceName: string;
  sourceNameError?: SourceNameValidationError;
  sourceSignals: SourceSignal[];
  sourceSignalsError?: 'required';
  canCreateSource: boolean;
  isUnitSaving: boolean;
  createdSource?: SourceViewModel;
  refreshUnit: () => void;
  createSource: () => void;
  setCreateSourceType: (sourceType: SourceType) => void;
  setCreateSourceName: (sourceName: string) => void;
  setCreateSourceSignals: (signals: SourceSignal[]) => void;
  validateCreateSourceName: () => void;
  deleteSource: (sourceId: string) => void;
  deleteSources: (sourceIds: string[]) => void;
  generateApiKey: (sourceId: string) => void;
  revealedApiKey?: RevealedApiKey;
  apiKeyPrivileges?: SourceApiKeyPrivileges;
  apiKeyError?: string;
  isGeneratingApiKey: boolean;
  isLoadingApiKeys: boolean;
  isCreatingSource: boolean;
  isSavingSource: boolean;
  isCreateFailed: boolean;
  deleteApiKey: (sourceId: string, apiKeyId: string) => void;
  setQuery: (query: string) => void;
  setSelectedSources: (sources: SourceViewModel[]) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openSourceFlyout: (sourceId: string) => void;
  closeSourceFlyout: () => void;
}

export interface SourcesTableController extends SourcesController {
  selectedTypes: SourceType[];
  sortingColumns: SourcesTableSortingColumn[];
  pagination: SourcesTablePagination;
  visibleColumnIds: string[];
  isLoadingUnit: boolean;
  isUnitUnavailable: boolean;
  setSelectedTypes: (types: SourceType[]) => void;
  setSortingColumns: (columns: SourcesTableSortingColumn[]) => void;
  setPagination: (pagination: SourcesTablePagination) => void;
  setVisibleColumnIds: (columnIds: string[]) => void;
}

const EMPTY_SOURCE_SIGNALS: SourceSignal[] = [];

const IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED = 'observability.managedOtlpPrwEndpointEnabled';

interface SourcesTableState {
  query: string;
  selectedSourceIds: string[];
  isRefreshingUnit: boolean;
  setQuery: (query: string) => void;
  setSelectedSourceIds: (sourceIds: string[]) => void;
  refreshUnit: () => void;
}

export const useSourcesTable = (): SourcesTableController => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: { streams },
    },
  } = useKibana();
  const apiKeyGenerationDeps = useSourceApiKeyGenerationDeps();
  const loadSourceEnvironment = useSourceEnvironmentLoader();
  const unitDefinitionRepository = useMemo(
    () =>
      createUnitRepository({
        streamsRepositoryClient: streams.streamsRepositoryClient,
        toasts,
      }),
    [streams.streamsRepositoryClient, toasts]
  );
  const tableActorRef = useActorRef(sourcesTableStateMachine, {
    input: {
      apiKeyGenerationDeps,
      toasts,
      loadSourceEnvironment,
      loadUnitDefinition: unitDefinitionRepository.load,
      persistUnitDefinition: unitDefinitionRepository.persist,
    },
  });
  const sourcesActorRef = useSelector(tableActorRef, (state) => state.context.sourcesRef);
  const query = useSelector(tableActorRef, (state) => state.context.query);
  const selectedSourceIds = useSelector(tableActorRef, (state) => state.context.selectedSourceIds);
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
        title: i18n.translate('xpack.streams.sources.unitRequestFailedTitle', {
          defaultMessage: 'Could not update sources',
        }),
      });
    }
  }, [error, toasts]);

  const sourcesController = useSources({
    sourcesActorRef,
    tableState: {
      query,
      selectedSourceIds,
      isRefreshingUnit,
      setQuery: (nextQuery) => tableActorRef.send({ type: 'search.change', query: nextQuery }),
      setSelectedSourceIds: (sourceIds) =>
        tableActorRef.send({ type: 'selection.change', sourceIds }),
      refreshUnit: () => tableActorRef.send({ type: 'unit.reload' }),
    },
  });

  return useMemo(
    () => ({
      ...sourcesController,
      selectedTypes,
      sortingColumns,
      pagination,
      visibleColumnIds,
      isLoadingUnit,
      isUnitUnavailable,
      setSelectedTypes: (sourceTypes: SourceType[]) =>
        tableActorRef.send({ type: 'filters.types.change', sourceTypes }),
      setSortingColumns: (columns: SourcesTableSortingColumn[]) =>
        tableActorRef.send({ type: 'sorting.change', columns }),
      setPagination: (nextPagination: SourcesTablePagination) =>
        tableActorRef.send({ type: 'pagination.change', pagination: nextPagination }),
      setVisibleColumnIds: (columnIds: string[]) =>
        tableActorRef.send({ type: 'visibleColumns.change', columnIds }),
    }),
    [
      isLoadingUnit,
      isUnitUnavailable,
      pagination,
      selectedTypes,
      sortingColumns,
      sourcesController,
      tableActorRef,
      visibleColumnIds,
    ]
  );
};

export const useSourceApiKeyGenerationDeps = (): SourceApiKeyGenerationDeps => {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  return useMemo(
    () => ({
      streamsRepositoryClient: streams.streamsRepositoryClient,
      unitId: STREAMS_DEFAULT_UNIT_ID,
    }),
    [streams.streamsRepositoryClient]
  );
};

export const useSourceEnvironmentLoader = (): SourceEnvironmentLoader => {
  const {
    core,
    isServerless,
    dependencies: {
      start: { cloud },
    },
  } = useKibana();
  const managedOtlpPrwEndpointEnabled = core.featureFlags.useBooleanValue(
    IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED,
    false
  );

  return useMemo(
    () =>
      createSourceEnvironmentLoader({
        cloud,
        isServerless,
        managedOtlpPrwEndpointEnabled,
      }),
    [cloud, isServerless, managedOtlpPrwEndpointEnabled]
  );
};

export const useSources = ({
  sourcesActorRef,
  tableState,
}: {
  sourcesActorRef: SourcesActorRef;
  tableState?: SourcesTableState;
}): SourcesController => {
  const selectedSourceId = useSelector(sourcesActorRef, (state) => state.context.selectedSourceId);
  const revealedApiKey = useSelector(sourcesActorRef, (state) => state.context.revealedApiKey);
  const apiKeyPrivileges = useSelector(sourcesActorRef, (state) => state.context.apiKeyPrivileges);
  const apiKeyError = useSelector(sourcesActorRef, (state) => state.context.apiKeyError?.message);
  const creationContext = useSelector(sourcesActorRef, (state) => state.context.creationContext);
  const sourceType = creationContext?.formData.sourceType ?? 'async_bulk';
  const sourceName = creationContext?.formData.sourceName ?? '';
  const sourceNameError = creationContext?.formErrors.sourceName;
  const sourceSignals = creationContext?.formData.signals ?? EMPTY_SOURCE_SIGNALS;
  const sourceSignalsError = creationContext?.formErrors.signals;
  const createdSource = creationContext?.createdSource;
  const availableSourceTypes = useSelector(
    sourcesActorRef,
    (state) => state.context.availableSourceTypes
  );
  const isGeneratingApiKey = useSelector(
    sourcesActorRef,
    (state) =>
      state.matches({ flyout: { apiKey: 'generating' } }) ||
      state.matches({ configuring: { apiKey: 'generating' } })
  );
  const isCreatingSource = useSelector(
    sourcesActorRef,
    (state) =>
      state.matches({ configuring: 'persisting' }) ||
      state.matches({ configuring: { apiKey: 'generating' } })
  );
  const isSavingSource = useSelector(sourcesActorRef, (state) =>
    state.matches({ configuring: 'persisting' })
  );
  const isCreateFailed = useSelector(sourcesActorRef, (state) =>
    state.matches({ configuring: 'failed' })
  );
  const isLoadingApiKeys = useSelector(sourcesActorRef, (state) =>
    state.matches({ flyout: 'loading' })
  );
  const isCreateModalOpen = useSelector(
    sourcesActorRef,
    (state) => !state.matches({ configuring: 'idle' })
  );
  const canCreateSource = useSelector(sourcesActorRef, (state) => {
    const creation = state.context.creationContext;
    return Boolean(
      creation?.formData.sourceName.trim() &&
        !creation.formErrors.sourceName &&
        !creation.formErrors.signals &&
        state.context.availableSourceTypes.includes(creation.formData.sourceType)
    );
  });
  const isUnitSaving = useSelector(sourcesActorRef, (state) =>
    state.matches({ unitSave: 'saving' })
  );
  const query = tableState?.query ?? '';
  const selectedSourceIds = useMemo(
    () => tableState?.selectedSourceIds ?? [],
    [tableState?.selectedSourceIds]
  );
  const isRefreshingUnit = tableState?.isRefreshingUnit ?? false;

  const sourceViews = useSelector(sourcesActorRef, (state) => getSourceViewModels(state.context));

  const createSource = useCallback(
    () => sourcesActorRef.send({ type: 'source.create' }),
    [sourcesActorRef]
  );

  const setCreateSourceType = useCallback(
    (nextSourceType: SourceType) =>
      sourcesActorRef.send({ type: 'sourceType.select', sourceType: nextSourceType }),
    [sourcesActorRef]
  );

  const setCreateSourceName = useCallback(
    (nextSourceName: string) =>
      sourcesActorRef.send({ type: 'sourceName.change', sourceName: nextSourceName }),
    [sourcesActorRef]
  );

  const validateCreateSourceName = useCallback(
    () => sourcesActorRef.send({ type: 'sourceName.blur' }),
    [sourcesActorRef]
  );

  const setCreateSourceSignals = useCallback(
    (signals: SourceSignal[]) => sourcesActorRef.send({ type: 'signals.change', signals }),
    [sourcesActorRef]
  );

  const openCreateModal = useCallback(
    () => sourcesActorRef.send({ type: 'modal.openCreate' }),
    [sourcesActorRef]
  );

  const deleteSource = useCallback(
    (sourceId: string) => sourcesActorRef.send({ type: 'source.delete', sourceId }),
    [sourcesActorRef]
  );
  const deleteSources = useCallback(
    (sourceIds: string[]) => sourcesActorRef.send({ type: 'source.deleteMany', sourceIds }),
    [sourcesActorRef]
  );

  const generateApiKey = useCallback(
    (sourceId: string) => {
      sourcesActorRef.send({
        type: 'apiKey.generate',
        sourceId,
      });
    },
    [sourcesActorRef]
  );

  const deleteApiKey = useCallback(
    (sourceId: string, apiKeyId: string) =>
      sourcesActorRef.send({ type: 'apiKey.delete', sourceId, apiKeyId }),
    [sourcesActorRef]
  );

  return useMemo(
    () => ({
      sources: sourceViews,
      query,
      selectedSource: sourceViews.find(({ id }) => id === selectedSourceId),
      selectedSources: sourceViews.filter(({ id }) => selectedSourceIds.includes(id)),
      isCreateModalOpen,
      isRefreshingUnit,
      sourceType,
      availableSourceTypes,
      sourceName,
      sourceNameError,
      sourceSignals,
      sourceSignalsError,
      canCreateSource: canCreateSource && !isUnitSaving,
      isUnitSaving,
      createdSource,
      refreshUnit: () => {
        tableState?.refreshUnit();
      },
      createSource,
      setCreateSourceType,
      setCreateSourceName,
      setCreateSourceSignals,
      validateCreateSourceName,
      deleteSource,
      deleteSources,
      generateApiKey,
      revealedApiKey,
      apiKeyPrivileges,
      apiKeyError,
      isGeneratingApiKey,
      isLoadingApiKeys,
      isCreatingSource,
      isSavingSource,
      isCreateFailed,
      deleteApiKey,
      setQuery: (nextQuery: string) => {
        tableState?.setQuery(nextQuery);
      },
      setSelectedSources: (selectedSources: SourceViewModel[]) => {
        const sourceIds = selectedSources.map(({ id }) => id);
        tableState?.setSelectedSourceIds(sourceIds);
      },
      openCreateModal,
      closeCreateModal: () => sourcesActorRef.send({ type: 'modal.closeCreate' }),
      openSourceFlyout: (sourceId: string) =>
        sourcesActorRef.send({ type: 'source.view', sourceId }),
      closeSourceFlyout: () => sourcesActorRef.send({ type: 'flyout.close' }),
    }),
    [
      availableSourceTypes,
      canCreateSource,
      isUnitSaving,
      createSource,
      createdSource,
      deleteApiKey,
      deleteSource,
      deleteSources,
      generateApiKey,
      isGeneratingApiKey,
      isLoadingApiKeys,
      isCreatingSource,
      isCreateFailed,
      isRefreshingUnit,
      isSavingSource,
      revealedApiKey,
      apiKeyPrivileges,
      apiKeyError,
      isCreateModalOpen,
      openCreateModal,
      query,
      selectedSourceId,
      selectedSourceIds,
      setCreateSourceName,
      setCreateSourceSignals,
      setCreateSourceType,
      sourceName,
      sourceNameError,
      sourceSignals,
      sourceSignalsError,
      sourceType,
      sourceViews,
      sourcesActorRef,
      tableState,
      validateCreateSourceName,
    ]
  );
};
