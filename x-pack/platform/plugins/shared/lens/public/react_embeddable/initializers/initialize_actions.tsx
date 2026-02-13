/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { AggregateQuery, EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
import { isOfQueryType } from '@kbn/es-query';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import {
  apiPublishesProjectRouting,
  apiPublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import type {
  EmbeddableDynamicActionsManager,
  HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import { partition } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type {
  Datasource,
  IndexPatternMap,
  TableInspectorAdapter,
  Visualization,
  GetStateType,
  LensInternalApi,
  LensRuntimeState,
  ViewInDiscoverCallbacks,
  ViewUnderlyingDataArgs,
} from '@kbn/lens-common';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import {
  combineQueryAndFilters,
  findDataViewByIndexPatternId,
  getLayerMetaInfo,
} from '../../app_plugin/show_underlying_data';

import { getMergedSearchContext } from '../expressions/merged_search_context';
import { isTextBasedLanguage } from '../helper';
import type { LensEmbeddableStartServices } from '../types';
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

  const dataViewSpec = findDataViewByIndexPatternId(meta.id, dataViews)?.spec;

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

  const { projectRouting$ } = apiPublishesProjectRouting(parentApi)
    ? parentApi
    : { projectRouting$: undefined };

  const mergedSearchContext = getMergedSearchContext(
    state,
    {
      filters: filters$?.getValue(),
      query: query$?.getValue(),
      timeRange: timeRange$?.getValue(),
      projectRouting: projectRouting$?.getValue(),
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

  const canViewUnderlyingData$ = new BehaviorSubject<boolean>(false);

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
  internalApi: LensInternalApi,
  services: LensEmbeddableStartServices,
  dynamicActionsManager?: EmbeddableDynamicActionsManager
): {
  api: ViewInDiscoverCallbacks & HasDynamicActions;
  anyStateChange$: Observable<void>;
  getComparators: () => EmbeddableDynamicActionsManager['comparators'];
  getLatestState: () => ReturnType<EmbeddableDynamicActionsManager['getLatestState']>;
  cleanup: () => void;
  reinitializeState: (lastSaved?: LensSerializedAPIConfig) => void;
} {
  const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();

  return {
    api: {
      ...(isTextBasedLanguage(initialState) ? {} : dynamicActionsManager?.api ?? {}),
      ...createViewUnderlyingDataApis(
        getLatestState,
        internalApi,
        searchContextApi,
        parentApi,
        services
      ),
    },
    anyStateChange$: dynamicActionsManager?.anyStateChange$ ?? new BehaviorSubject(undefined),
    getComparators: () => ({
      ...(dynamicActionsManager?.comparators ?? {
        drilldowns: 'skip',
        enhancements: 'skip',
      }),
    }),
    getLatestState: () => dynamicActionsManager?.getLatestState() ?? {},
    cleanup: () => {
      maybeStopDynamicActions?.stopDynamicActions();
    },
    reinitializeState: (lastSaved?: LensSerializedAPIConfig) => {
      dynamicActionsManager?.reinitializeState(lastSaved ?? {});
    },
  };
}
