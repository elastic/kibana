/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  AggregateQuery,
  EsQueryConfig,
  Filter,
  Query,
  TimeRange,
  isOfQueryType,
} from '@kbn/es-query';
import {
  PublishesTitle,
  PublishingSubject,
  StateComparators,
  apiPublishesUnifiedSearch,
  getUnchangingComparator,
} from '@kbn/presentation-publishing';
import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { partition } from 'lodash';
import { Visualization } from '../..';
import { combineQueryAndFilters, getLayerMetaInfo } from '../../app_plugin/show_underlying_data';
import { TableInspectorAdapter } from '../../editor_frame_service/types';

import { Datasource, IndexPatternMap } from '../../types';
import { getMergedSearchContext } from '../expressions/merged_search_context';
import { buildObservableVariable, isTextBasedLanguage } from '../helper';
import type {
  GetStateType,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensRuntimeState,
  ViewInDiscoverCallbacks,
  ViewUnderlyingDataArgs,
} from '../types';
import { getActiveDatasourceIdFromDoc, getActiveVisualizationIdFromDoc } from '../../utils';

function getViewUnderlyingDataArgs({
  activeDatasource,
  activeDatasourceState,
  activeVisualization,
  activeVisualizationState,
  activeData,
  dataViews,
  capabilities,
  query,
  filters,
  timeRange,
  esQueryConfig,
}: {
  activeDatasource: Datasource;
  activeDatasourceState: unknown;
  activeVisualization: Visualization;
  activeVisualizationState: unknown;
  activeData: TableInspectorAdapter | undefined;
  dataViews: IndexPatternMap;
  capabilities: {
    canSaveVisualizations: boolean;
    canOpenVisualizations: boolean;
    canSaveDashboards: boolean;
    navLinks: Capabilities['navLinks'];
    discover_v2: Capabilities['discover_v2'];
  };
  query: Array<Query | AggregateQuery>;
  filters: Filter[];
  timeRange: TimeRange;
  esQueryConfig: EsQueryConfig;
}) {
  const { error, meta } = getLayerMetaInfo(
    activeDatasource,
    activeDatasourceState,
    activeVisualization,
    activeVisualizationState,
    activeData,
    dataViews,
    timeRange,
    capabilities
  );

  if (error || !meta) {
    return;
  }
  const luceneOrKuery: Query[] = [];
  const aggregateQueries: AggregateQuery[] = [];

  if (Array.isArray(query)) {
    const [kqlOrLuceneQueries, esqlQueries] = partition(query, isOfQueryType);
    if (kqlOrLuceneQueries.length) {
      luceneOrKuery.push(...kqlOrLuceneQueries);
    }
    if (esqlQueries.length) {
      aggregateQueries.push(...esqlQueries);
    }
  }

  const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
    luceneOrKuery.length > 0 ? luceneOrKuery : aggregateQueries[0],
    filters,
    meta,
    Object.values(dataViews),
    esQueryConfig
  );

  const dataViewSpec = dataViews[meta.id]!.spec;

  return {
    dataViewSpec,
    timeRange,
    filters: newFilters,
    query: aggregateQueries.length > 0 ? aggregateQueries[0] : newQuery,
    columns: meta.columns,
  };
}

function loadViewUnderlyingDataArgs(
  state: LensRuntimeState,
  { getVisualizationContext }: LensInternalApi,
  searchContextApi: { timeRange$: PublishingSubject<TimeRange | undefined> },
  parentApi: unknown,
  {
    capabilities,
    uiSettings,
    injectFilterReferences,
    data,
    datasourceMap,
    visualizationMap,
  }: LensEmbeddableStartServices
) {
  const {
    activeAttributes,
    activeData,
    activeDatasourceState,
    activeVisualizationState,
    indexPatterns,
  } = getVisualizationContext();
  const activeVisualizationId = getActiveVisualizationIdFromDoc(activeAttributes);
  const activeDatasourceId = getActiveDatasourceIdFromDoc(activeAttributes);
  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : undefined;
  const activeDatasource = activeDatasourceId ? datasourceMap[activeDatasourceId] : undefined;
  if (
    !activeAttributes ||
    !activeData ||
    !activeDatasource ||
    !activeDatasourceState ||
    !activeVisualization ||
    !activeVisualizationState
  ) {
    return;
  }

  const { filters$, query$, timeRange$ } = apiPublishesUnifiedSearch(parentApi)
    ? parentApi
    : { filters$: undefined, query$: undefined, timeRange$: undefined };

  const mergedSearchContext = getMergedSearchContext(
    state,
    {
      filters: filters$?.getValue(),
      query: query$?.getValue(),
      timeRange: timeRange$?.getValue(),
    },
    searchContextApi.timeRange$,
    parentApi,
    {
      data,
      injectFilterReferences,
    }
  );

  if (!mergedSearchContext.timeRange) {
    return;
  }

  const viewUnderlyingDataArgs = getViewUnderlyingDataArgs({
    activeDatasource,
    activeDatasourceState,
    activeVisualization,
    activeVisualizationState,
    activeData,
    capabilities: {
      canSaveDashboards: Boolean(capabilities.dashboard_v2?.showWriteControls),
      canSaveVisualizations: Boolean(capabilities.visualize_v2.save),
      canOpenVisualizations: Boolean(capabilities.visualize_v2.show),
      navLinks: capabilities.navLinks,
      discover_v2: capabilities.discover_v2,
    },
    query: mergedSearchContext.query,
    filters: mergedSearchContext.filters || [],
    timeRange: mergedSearchContext.timeRange,
    esQueryConfig: getEsQueryConfig(uiSettings),
    dataViews: indexPatterns,
  });

  return viewUnderlyingDataArgs;
}

function createViewUnderlyingDataApis(
  getState: GetStateType,
  internalApi: LensInternalApi,
  searchContextApi: { timeRange$: PublishingSubject<TimeRange | undefined> },
  parentApi: unknown,
  services: LensEmbeddableStartServices
): ViewInDiscoverCallbacks {
  let viewUnderlyingDataArgs: undefined | ViewUnderlyingDataArgs;

  const [canViewUnderlyingData$] = buildObservableVariable<boolean>(false);

  return {
    canViewUnderlyingData$,
    loadViewUnderlyingData: () => {
      viewUnderlyingDataArgs = loadViewUnderlyingDataArgs(
        getState(),
        internalApi,
        searchContextApi,
        parentApi,
        services
      );
      canViewUnderlyingData$.next(viewUnderlyingDataArgs != null);
    },
    getViewUnderlyingDataArgs: () => {
      return viewUnderlyingDataArgs;
    },
  };
}

/**
 * Initialize APIs used for actions on Lens panels
 * This includes drilldowns, explore data, and more
 */
export function initializeActionApi(
  uuid: string,
  initialState: LensRuntimeState,
  getLatestState: GetStateType,
  parentApi: unknown,
  searchContextApi: { timeRange$: PublishingSubject<TimeRange | undefined> },
  title$: PublishesTitle['title$'],
  internalApi: LensInternalApi,
  services: LensEmbeddableStartServices
): {
  api: ViewInDiscoverCallbacks & HasDynamicActions;
  comparators: StateComparators<DynamicActionsSerializedState>;
  serialize: () => {};
  cleanup: () => void;
} {
  const dynamicActionsApi = services.embeddableEnhanced?.initializeReactEmbeddableDynamicActions(
    uuid,
    () => title$.getValue(),
    initialState
  );
  const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

  return {
    api: {
      ...(isTextBasedLanguage(initialState) ? {} : dynamicActionsApi?.dynamicActionsApi ?? {}),
      ...createViewUnderlyingDataApis(
        getLatestState,
        internalApi,
        searchContextApi,
        parentApi,
        services
      ),
    },
    comparators: {
      ...(dynamicActionsApi?.dynamicActionsComparator ?? {
        enhancements: getUnchangingComparator(),
      }),
    },
    serialize: () => dynamicActionsApi?.serializeDynamicActions() ?? {},
    cleanup: () => {
      maybeStopDynamicActions?.stopDynamicActions();
    },
  };
}
