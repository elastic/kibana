/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';

import { forkJoin, of, Observable, Subject } from 'rxjs';
import { mergeMap, switchMap, tap } from 'rxjs/operators';

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
  AppStateSelectedCells,
  ExplorerJob,
  TimeRangeBounds,
} from '../explorer_utils';
import { ExplorerState } from '../reducers';

// Memoize the data fetching methods.
// wrapWithLastRefreshArg() wraps any given function and preprends a `lastRefresh` argument
// which will be considered by memoizeOne. This way we can add the `lastRefresh` argument as a
// caching parameter without having to change all the original functions which shouldn't care
// about this parameter.
const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);
const wrapWithLastRefreshArg = <T extends (...origArgs: any[]) => any>(func: T) => {
  return function(lastRefresh: number, ...args: Parameters<T>) {
    return func.apply(null, args);
  };
};
const memoize = <T extends (...origArgs: any[]) => any>(func: T) => {
  return memoizeOne(wrapWithLastRefreshArg<T>(func), memoizeIsEqual);
};

const memoizedLoadAnnotationsTableData = memoize<typeof loadAnnotationsTableData>(
  loadAnnotationsTableData
);
const memoizedLoadDataForCharts = memoize<typeof loadDataForCharts>(loadDataForCharts);
const memoizedLoadFilteredTopInfluencers = memoize<typeof loadFilteredTopInfluencers>(
  loadFilteredTopInfluencers
);
const memoizedLoadOverallData = memoize(loadOverallData);
const memoizedLoadTopInfluencers = memoize(loadTopInfluencers);
const memoizedLoadViewBySwimlane = memoize(loadViewBySwimlane);
const memoizedLoadAnomaliesTableData = memoize(loadAnomaliesTableData);

const dateFormatTz = getDateFormatTz();

export interface LoadExplorerDataConfig {
  bounds: TimeRangeBounds;
  influencersFilterQuery: any;
  lastRefresh: number;
  noInfluencersConfigured: boolean;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[];
  swimlaneBucketInterval: any;
  swimlaneLimit: number;
  tableInterval: any;
  tableSeverity: number;
  viewBySwimlaneFieldName: string;
}

export const isLoadExplorerDataConfig = (arg: any): arg is LoadExplorerDataConfig => {
  return (
    arg !== undefined &&
    arg.bounds !== undefined &&
    arg.selectedJobs !== undefined &&
    arg.selectedJobs !== null &&
    arg.viewBySwimlaneFieldName !== undefined
  );
};

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 *
 * @param config LoadExplorerDataConfig
 *
 * @return Partial<ExplorerState>
 */
function loadExplorerData(config: LoadExplorerDataConfig): Observable<Partial<ExplorerState>> {
  if (!isLoadExplorerDataConfig(config)) {
    return of({});
  }

  const {
    bounds,
    lastRefresh,
    influencersFilterQuery,
    noInfluencersConfigured,
    selectedCells,
    selectedJobs,
    swimlaneBucketInterval,
    swimlaneLimit,
    tableInterval,
    tableSeverity,
    viewBySwimlaneFieldName,
  } = config;

  // TODO This factory should be refactored so we can load the charts using memoization.
  const updateCharts = explorerChartsContainerServiceFactory(explorerService.setCharts);

  const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);

  const jobIds =
    selectedCells !== undefined && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
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
      lastRefresh,
      selectedCells,
      selectedJobs,
      swimlaneBucketInterval.asSeconds(),
      bounds
    ),
    anomalyChartRecords: memoizedLoadDataForCharts(
      lastRefresh,
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
            lastRefresh,
            jobIds,
            timerange.earliestMs,
            timerange.latestMs,
            [],
            noInfluencersConfigured,
            influencersFilterQuery
          )
        : Promise.resolve({}),
    overallState: memoizedLoadOverallData(
      lastRefresh,
      selectedJobs,
      swimlaneBucketInterval,
      bounds
    ),
    tableData: memoizedLoadAnomaliesTableData(
      lastRefresh,
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
      selectedCells !== undefined && selectedCells.showTopFieldValues === true
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
      if (selectedCells !== undefined && Array.isArray(anomalyChartRecords)) {
        updateCharts(anomalyChartRecords, timerange.earliestMs, timerange.latestMs, tableSeverity);
      } else {
        updateCharts([], timerange.earliestMs, timerange.latestMs, tableSeverity);
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
                  lastRefresh,
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
            lastRefresh,
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
      (
        { annotationsData, overallState, tableData },
        { influencers, viewBySwimlaneState }
      ): Partial<ExplorerState> => {
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

const loadExplorerData$ = new Subject();
const loadExplorerDataWithSwitchMap$ = loadExplorerData$.pipe(
  switchMap((s: any) => loadExplorerData(s))
);

export const useExplorerData = (): [Partial<ExplorerState> | undefined, (d: any) => void] => {
  const explorerData = useObservable(loadExplorerDataWithSwitchMap$);
  return [explorerData, c => loadExplorerData$.next(c)];
};
