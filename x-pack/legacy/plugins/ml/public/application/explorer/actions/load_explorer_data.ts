/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';

import { forkJoin, of } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

import { explorerChartsContainerServiceFactory } from '../explorer_charts/explorer_charts_container_service';
import { VIEW_BY_JOB_LABEL } from '../explorer_constants';
import { explorerService } from '../explorer_dashboard_service';
import {
  getDateFormatTz,
  getSelectionInfluencers,
  getSelectionTimeRange,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadDataForCharts,
  loadFilteredTopInfluencers,
  loadOverallData,
  loadTopInfluencers,
  loadViewBySwimlane,
  loadViewByTopFieldValuesForSelectedTime,
} from '../explorer_utils';
import { ExplorerState } from '../reducers';

const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

// Memoize the data fetching methods
// TODO: We need to track an attribute that allows refetching when the date picker
// triggers a refresh, otherwise we'll get back the stale data. Note this was also
// an issue with the previous version and the custom caching done within the component.
const memoizedLoadAnnotationsTableData = memoizeOne(loadAnnotationsTableData, memoizeIsEqual);
const memoizedLoadDataForCharts = memoizeOne(loadDataForCharts, memoizeIsEqual);
const memoizedLoadFilteredTopInfluencers = memoizeOne(loadFilteredTopInfluencers, memoizeIsEqual);
const memoizedLoadOverallData = memoizeOne(loadOverallData, memoizeIsEqual);
const memoizedLoadTopInfluencers = memoizeOne(loadTopInfluencers, memoizeIsEqual);
const memoizedLoadViewBySwimlane = memoizeOne(loadViewBySwimlane, memoizeIsEqual);
const memoizedLoadAnomaliesTableData = memoizeOne(loadAnomaliesTableData, memoizeIsEqual);

const dateFormatTz = getDateFormatTz();

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 *
 * @param state ExplorerState
 *
 * @return Partial<ExplorerState>
 */
export function loadExplorerData(state: ExplorerState) {
  const {
    bounds,
    influencersFilterQuery,
    noInfluencersConfigured,
    selectedCells,
    selectedJobs,
    swimlaneBucketInterval,
    swimlaneLimit,
    tableInterval,
    tableSeverity,
    viewBySwimlaneFieldName,
  } = state;

  if (selectedJobs === null || bounds === undefined || viewBySwimlaneFieldName === undefined) {
    return of({});
  }

  // TODO This factory should be refactored so we can load the charts using memoization.
  const updateCharts = explorerChartsContainerServiceFactory(explorerService.setCharts);

  const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);

  const jobIds =
    selectedCells !== null && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
      ? selectedCells.lanes
      : selectedJobs.map(d => d.id);

  const timerange = getSelectionTimeRange(
    selectedCells,
    swimlaneBucketInterval.asSeconds(),
    bounds
  );

  // First get the data where we have all necessary args at hand using forkJoin:
  // annotationsData, anomalyChartRecords, influencers, overallState, tableData, topFieldValues
  return forkJoin({
    annotationsData: memoizedLoadAnnotationsTableData(
      selectedCells,
      selectedJobs,
      swimlaneBucketInterval.asSeconds(),
      bounds
    ),
    anomalyChartRecords: memoizedLoadDataForCharts(
      jobIds,
      timerange.earliestMs,
      timerange.latestMs,
      selectionInfluencers,
      selectedCells,
      influencersFilterQuery
    ),
    influencers:
      selectionInfluencers.length === 0
        ? memoizedLoadTopInfluencers(
            jobIds,
            timerange.earliestMs,
            timerange.latestMs,
            [],
            noInfluencersConfigured,
            influencersFilterQuery
          )
        : Promise.resolve({}),
    overallState: memoizedLoadOverallData(selectedJobs, swimlaneBucketInterval, bounds),
    tableData: memoizedLoadAnomaliesTableData(
      selectedCells,
      selectedJobs,
      dateFormatTz,
      swimlaneBucketInterval.asSeconds(),
      bounds,
      viewBySwimlaneFieldName,
      tableInterval,
      tableSeverity,
      influencersFilterQuery
    ),
    topFieldValues:
      selectedCells !== null && selectedCells.showTopFieldValues === true
        ? loadViewByTopFieldValuesForSelectedTime(
            timerange.earliestMs,
            timerange.latestMs,
            selectedJobs,
            viewBySwimlaneFieldName,
            swimlaneLimit,
            noInfluencersConfigured
          )
        : Promise.resolve([]),
  }).pipe(
    // Trigger a side-effect action to reset view-by swimlane,
    // show the view-by loading indicator
    // and pass on the data we already fetched.
    tap(explorerService.setViewBySwimlaneLoading),
    // Trigger a side-effect to update the charts.
    tap(({ anomalyChartRecords }) => {
      if (selectedCells !== null && Array.isArray(anomalyChartRecords)) {
        updateCharts(anomalyChartRecords, timerange.earliestMs, timerange.latestMs);
      } else {
        updateCharts([], timerange.earliestMs, timerange.latestMs);
      }
    }),
    // Load view-by swimlane data and filtered top influencers.
    // mergeMap is used to have access to the already fetched data and act on it in arg #1.
    // In arg #2 of mergeMap we combine the data and pass it on in the action format
    // which can be consumed by explorerReducer() later on.
    mergeMap(
      ({ anomalyChartRecords, influencers, overallState, topFieldValues }) =>
        forkJoin({
          influencers:
            (selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) &&
            anomalyChartRecords !== undefined &&
            anomalyChartRecords.length > 0
              ? memoizedLoadFilteredTopInfluencers(
                  jobIds,
                  timerange.earliestMs,
                  timerange.latestMs,
                  anomalyChartRecords,
                  selectionInfluencers,
                  noInfluencersConfigured,
                  influencersFilterQuery
                )
              : Promise.resolve(influencers),
          viewBySwimlaneState: memoizedLoadViewBySwimlane(
            topFieldValues,
            {
              earliest: overallState.overallSwimlaneData.earliest,
              latest: overallState.overallSwimlaneData.latest,
            },
            selectedJobs,
            viewBySwimlaneFieldName,
            swimlaneLimit,
            influencersFilterQuery,
            noInfluencersConfigured
          ),
        }),
      ({ annotationsData, overallState, tableData }, { influencers, viewBySwimlaneState }) => {
        return {
          annotationsData,
          influencers,
          ...overallState,
          ...viewBySwimlaneState,
          tableData,
        };
      }
    )
  );
}
