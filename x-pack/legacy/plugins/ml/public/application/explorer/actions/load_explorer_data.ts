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

const memoizedLoadAnnotationsTableData = memoizeOne(loadAnnotationsTableData, memoizeIsEqual);
const memoizedLoadDataForCharts = memoizeOne(loadDataForCharts, memoizeIsEqual);
const memoizedLoadFilteredTopInfluencers = memoizeOne(loadFilteredTopInfluencers, memoizeIsEqual);
const memoizedLoadOverallData = memoizeOne(loadOverallData, memoizeIsEqual);
const memoizedLoadTopInfluencers = memoizeOne(loadTopInfluencers, memoizeIsEqual);
const memoizedLoadViewBySwimlane = memoizeOne(loadViewBySwimlane, memoizeIsEqual);
const memoizedLoadAnomaliesTableData = memoizeOne(loadAnomaliesTableData, memoizeIsEqual);

const dateFormatTz = getDateFormatTz();

// Load the overall data - if the FieldFormats failed to populate
// the default formatting will be used for metric values.
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

  // Load the overall data
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
    // Trigger action to reset view-by swimlane and show loading indicator
    tap(({ annotationsData, overallState, tableData }) => {
      explorerAction$.next({
        type: EXPLORER_ACTION.SET_STATE,
        payload: {
          annotationsData,
          overallState,
          tableData,
          viewBySwimlaneFieldName,
          viewBySwimlaneData: {
            ...getDefaultSwimlaneData(),
            fieldName: viewBySwimlaneFieldName,
          },
          viewBySwimlaneDataLoading: true,
        },
      });
    }),
    // Load view-by swimlane data and filtered top influencers
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
    }),
    // Update charts
    tap(action => {
      const { anomalyChartRecords } = action.payload;

      if (selectedCells !== null && Array.isArray(anomalyChartRecords)) {
        updateCharts(anomalyChartRecords, timerange.earliestMs, timerange.latestMs);
      } else {
        updateCharts([], timerange.earliestMs, timerange.latestMs);
      }
    })
  );
}
