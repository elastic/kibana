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
  PublishingSubject,
  StateComparators,
  apiPublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import {
  DynamicActionsSerializedState,
  EmbeddableDynamicActionsManager,
  HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import { partition } from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { TracksOverlays, tracksOverlays } from '@kbn/presentation-containers';
import React from 'react';
import { Visualization } from '../..';
import { combineQueryAndFilters, getLayerMetaInfo } from '../../app_plugin/show_underlying_data';
import { TableInspectorAdapter } from '../../editor_frame_service/types';

import { Datasource, IndexPatternMap } from '../../types';
import { getMergedSearchContext } from '../expressions/merged_search_context';
import { isTextBasedLanguage } from '../helper';
import type {
  GetStateType,
  IntegrationCallbacks,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensRuntimeState,
  LensSerializedState,
  ViewInDiscoverCallbacks,
  ViewUnderlyingDataArgs,
} from '../types';
import { getActiveDatasourceIdFromDoc, getActiveVisualizationIdFromDoc } from '../../utils';
import { mountInlinePanel } from '../mount';

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
  api: ViewInDiscoverCallbacks &
    HasDynamicActions &
    Pick<IntegrationCallbacks, 'mountInlineFlyout'>;
  anyStateChange$: Observable<void>;
  getComparators: () => StateComparators<DynamicActionsSerializedState>;
  getLatestState: () => DynamicActionsSerializedState;
  cleanup: () => void;
  reinitializeState: (lastSaved?: LensSerializedState) => void;
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
      mountInlineFlyout: (
        Component: React.ComponentType,
        overlayTracker?: TracksOverlays,
        options: {
          dataTestSubj?: string;
          uuid?: string;
          container?: HTMLElement | null;
        } = {}
      ) => {
        mountInlinePanel(
          <Component />,
          services.coreStart,
          overlayTracker ?? (tracksOverlays(parentApi) ? parentApi : undefined),
          { uuid, ...options }
        );
      },
    },
    anyStateChange$: dynamicActionsManager?.anyStateChange$ ?? new BehaviorSubject(undefined),
    getComparators: () => ({
      ...(dynamicActionsManager?.comparators ?? {
        enhancements: 'skip',
      }),
    }),
    getLatestState: () => dynamicActionsManager?.getLatestState() ?? {},
    cleanup: () => {
      maybeStopDynamicActions?.stopDynamicActions();
    },
    reinitializeState: (lastSaved?: LensSerializedState) => {
      dynamicActionsManager?.reinitializeState(lastSaved ?? {});
    },
  };
}
