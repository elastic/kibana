/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';

import { forkJoin } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { formatHumanReadableDateTime } from '../../util/date_utils';

import {
  explorerChartsContainerServiceFactory,
  getDefaultChartsData,
} from '../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION, SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../explorer_constants';
import { explorerAction$ } from '../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDateFormatTz,
  getDefaultSwimlaneData,
  getSelectionInfluencers,
  getSelectionTimeRange,
  getSwimlaneBucketInterval,
  getViewBySwimlaneOptions,
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

interface SwimlanePoint {
  laneLabel: string;
  time: number;
}

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
 * @return action observable
 */
export function loadExplorerDataActionCreator(state: ExplorerState) {
  const {
    bounds,
    filterActive,
    filteredFields,
    influencersFilterQuery,
    isAndOperator,
    noInfluencersConfigured,
    selectedCells,
    selectedJobs,
    swimlaneContainerWidth,
    swimlaneLimit,
    tableInterval,
    tableSeverity,
    viewBySwimlaneFieldName: currentViewBySwimlaneFieldName,
  } = state;

  if (selectedJobs === null) {
    return null;
  }

  const swimlaneBucketInterval = getSwimlaneBucketInterval(selectedJobs, swimlaneContainerWidth);

  // TODO This factory should be refactored so we can load the charts using memoization.
  const updateCharts = explorerChartsContainerServiceFactory(data => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_STATE,
      payload: {
        chartsData: {
          ...getDefaultChartsData(),
          chartsPerRow: data.chartsPerRow,
          seriesToPlot: data.seriesToPlot,
          // convert truthy/falsy value to Boolean
          tooManyBuckets: !!data.tooManyBuckets,
        },
      },
    });
  });

  // Does a sanity check on the selected `currentViewBySwimlaneFieldName`
  // and returns the available `viewBySwimlaneOptions`.
  const { viewBySwimlaneFieldName, viewBySwimlaneOptions } = getViewBySwimlaneOptions({
    currentViewBySwimlaneFieldName,
    filterActive,
    filteredFields,
    isAndOperator,
    selectedJobs,
    selectedCells,
  });

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

  // Trigger a side effect to pass on updated information to the state.
  explorerAction$.next({
    type: EXPLORER_ACTION.SET_STATE,
    payload: {
      viewByLoadedForTimeFormatted:
        selectedCells !== null && selectedCells.showTopFieldValues === true
          ? formatHumanReadableDateTime(timerange.earliestMs)
          : null,
      viewBySwimlaneFieldName,
      viewBySwimlaneOptions,
    },
  });

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
    tap(({ annotationsData, overallState, tableData }) => {
      explorerAction$.next({
        type: EXPLORER_ACTION.SET_STATE,
        payload: {
          annotationsData,
          overallState,
          tableData,
          viewBySwimlaneData: {
            ...getDefaultSwimlaneData(),
            fieldName: viewBySwimlaneFieldName,
          },
          viewBySwimlaneDataLoading: true,
        },
      });
    }),
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
          type: EXPLORER_ACTION.SET_STATE,
          payload: {
            annotationsData,
            influencers,
            ...overallState,
            ...viewBySwimlaneState,
            tableData,
          },
        };
      }
    ),
    // do a sanity check against selectedCells. It can happen that a previously
    // selected lane loaded via URL/AppState is not available anymore.
    // If filter is active - selectedCell may not be available due to swimlane view by change to filter fieldName
    // Ok to keep cellSelection in this case
    map(action => {
      const { viewBySwimlaneData } = action.payload;

      let clearSelection = false;
      if (selectedCells !== null && selectedCells.type === SWIMLANE_TYPE.VIEW_BY) {
        clearSelection =
          filterActive === false &&
          !selectedCells.lanes.some((lane: string) => {
            return viewBySwimlaneData.points.some((point: SwimlanePoint) => {
              return (
                point.laneLabel === lane &&
                point.time >= selectedCells.times[0] &&
                point.time <= selectedCells.times[1]
              );
            });
          });
      }

      if (clearSelection === true) {
        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
        action.payload = { ...action.payload, ...getClearedSelectedAnomaliesState() };
      }

      return action;
    }),
    // Set the KQL query bar placeholder value
    map(action => {
      const { influencers } = action.payload;

      if (influencers !== undefined && !noInfluencersConfigured) {
        for (const influencerName in influencers) {
          if (
            influencers[influencerName][0] &&
            influencers[influencerName][0].influencerFieldValue
          ) {
            action.payload.filterPlaceHolder = i18n.translate(
              'xpack.ml.explorer.kueryBar.filterPlaceholder',
              {
                defaultMessage: 'Filter by influencer fields… ({queryExample})',
                values: {
                  queryExample: `${influencerName} : ${influencers[influencerName][0].influencerFieldValue}`,
                },
              }
            );
            break;
          }
        }
      }

      return action;
    })
  );
}
