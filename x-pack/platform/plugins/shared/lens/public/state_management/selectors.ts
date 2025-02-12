/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { FilterManager } from '@kbn/data-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { LensState } from './types';
import { DatasourceMap, VisualizationMap } from '../types';
import { getDatasourceLayers } from './utils';
import { mergeToNewDoc } from './shared_logic';

export const selectPersistedDoc = (state: LensState) => state.lens.persistedDoc;
export const selectQuery = (state: LensState) => state.lens.query;
export const selectSearchSessionId = (state: LensState) => state.lens.searchSessionId;
export const selectFilters = (state: LensState) => state.lens.filters;
export const selectResolvedDateRange = (state: LensState) => state.lens.resolvedDateRange;
export const selectAdHocDataViews = (state: LensState) =>
  Object.fromEntries(
    Object.values(state.lens.dataViews.indexPatterns)
      .filter((indexPattern) => !indexPattern.isPersisted)
      .map((indexPattern) => [indexPattern.id, indexPattern.spec!])
  );
export const selectVisualization = (state: LensState) => state.lens.visualization;
export const selectStagedPreview = (state: LensState) => state.lens.stagedPreview;
export const selectStagedActiveData = (state: LensState) =>
  state.lens.stagedPreview?.activeData || state.lens.activeData;
export const selectAutoApplyEnabled = (state: LensState) => !state.lens.autoApplyDisabled;
export const selectChangesApplied = (state: LensState) =>
  !state.lens.autoApplyDisabled || Boolean(state.lens.changesApplied);
export const selectDatasourceStates = (state: LensState) => state.lens.datasourceStates;
export const selectVisualizationState = (state: LensState) => state.lens.visualization;
export const selectActiveDatasourceId = (state: LensState) => state.lens.activeDatasourceId;
export const selectActiveData = (state: LensState) => state.lens.activeData;
export const selectDataViews = (state: LensState) => state.lens.dataViews;
export const selectIsManaged = (state: LensState) => state.lens.managed;
export const selectIsFullscreenDatasource = (state: LensState) =>
  Boolean(state.lens.isFullscreenDatasource);

let applyChangesCounter: number | undefined;
export const selectTriggerApplyChanges = (state: LensState) => {
  const shouldApply = state.lens.applyChangesCounter !== applyChangesCounter;
  applyChangesCounter = state.lens.applyChangesCounter;
  return shouldApply;
};

// TODO - is there any point to keeping this around since we have selectExecutionSearchContext?
export const selectExecutionContext = createSelector(
  [selectQuery, selectFilters, selectResolvedDateRange],
  (query, filters, dateRange) => ({
    now: Date.now(),
    dateRange,
    query,
    filters,
  })
);

export const selectExecutionContextSearch = createSelector(selectExecutionContext, (res) => ({
  now: res.now,
  query: isOfAggregateQueryType(res.query) ? undefined : res.query,
  timeRange: {
    from: res.dateRange.fromDate,
    to: res.dateRange.toDate,
  },
  filters: res.filters,
  disableWarningToasts: true,
}));

const selectInjectedDependencies = (_state: LensState, dependencies: unknown) => dependencies;

// use this type to cast selectInjectedDependencies to require whatever outside dependencies the selector needs
type SelectInjectedDependenciesFunction<T> = (state: LensState, dependencies: T) => T;

export const selectSavedObjectFormat = createSelector(
  [
    selectPersistedDoc,
    selectVisualization,
    selectDatasourceStates,
    selectQuery,
    selectFilters,
    selectActiveDatasourceId,
    selectAdHocDataViews,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<{
      datasourceMap: DatasourceMap;
      visualizationMap: VisualizationMap;
      extractFilterReferences: FilterManager['extract'];
    }>,
  ],
  mergeToNewDoc
);

export const selectCurrentVisualization = createSelector(
  [selectVisualization, selectStagedPreview],
  (visualization, stagedPreview) => (stagedPreview ? stagedPreview.visualization : visualization)
);

export const selectCurrentDatasourceStates = createSelector(
  [selectDatasourceStates, selectStagedPreview],
  (datasourceStates, stagedPreview) =>
    stagedPreview ? stagedPreview.datasourceStates : datasourceStates
);

export const selectAreDatasourcesLoaded = createSelector(
  selectDatasourceStates,
  (datasourceStates) =>
    Object.values(datasourceStates).every(({ isLoading }) => isLoading === false)
);

export const selectDatasourceLayers = createSelector(
  [
    selectDatasourceStates,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<DatasourceMap>,
    selectDataViews,
  ],
  (datasourceStates, datasourceMap, dataViews) =>
    getDatasourceLayers(datasourceStates, datasourceMap, dataViews.indexPatterns)
);

export const selectFramePublicAPI = createSelector(
  [
    selectCurrentDatasourceStates,
    selectActiveData,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<DatasourceMap>,
    selectDataViews,
    selectExecutionContext,
  ],
  (datasourceStates, activeData, datasourceMap, dataViews, context) => {
    return {
      datasourceLayers: getDatasourceLayers(
        datasourceStates,
        datasourceMap,
        dataViews.indexPatterns
      ),
      activeData,
      dataViews,
      ...context,
      absDateRange: context.dateRange,
    };
  }
);
