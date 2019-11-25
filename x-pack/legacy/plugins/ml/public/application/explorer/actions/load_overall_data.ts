/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';

import { forkJoin } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';

import { formatHumanReadableDateTime } from '../../util/date_utils';
import { TimeBucketsInterval } from '../../util/time_buckets';

import { EXPLORER_ACTION, SWIMLANE_TYPE } from '../explorer_constants';
import { explorerAction$ } from '../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDefaultViewBySwimlaneData,
  loadOverallData,
  loadViewBySwimlane,
  loadViewByTopFieldValuesForSelectedTime,
  ExplorerJob,
  TimeRangeBounds,
} from '../explorer_utils';

interface SwimlanePoint {
  laneLabel: string;
  time: number;
}

const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

const memoizedLoadOverallData = memoizeOne(loadOverallData, memoizeIsEqual);
const memoizedLoadViewBySwimlane = memoizeOne(loadViewBySwimlane, memoizeIsEqual);

// Load the overall data - if the FieldFormats failed to populate
// the default formatting will be used for metric values.
export function loadOverallDataActionCreator(
  selectedCells: any,
  selectedJobs: ExplorerJob[],
  swimlaneBucketInterval: TimeBucketsInterval,
  bounds: TimeRangeBounds,
  showOverallLoadingIndicator = true,
  viewBySwimlaneFieldName: string,
  viewBySwimlaneOptions: string[],
  influencersFilterQuery: any,
  timerange: any,
  swimlaneLimit: number,
  noInfluencersConfigured: boolean,
  filterActive: boolean
) {
  if (showOverallLoadingIndicator) {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_STATE,
      payload: { hasResults: false, loading: true },
    });
  }

  // load the overall swimlane data and top field values for the view-by swimlane
  return forkJoin({
    overallState: memoizedLoadOverallData(selectedJobs, swimlaneBucketInterval, bounds),
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
    tap(() => {
      explorerAction$.next({
        type: EXPLORER_ACTION.SET_STATE,
        payload: {
          viewBySwimlaneData: getDefaultViewBySwimlaneData(),
          viewBySwimlaneDataLoading: true,
        },
      });
    }),
    // Load view-by swimlane data
    mergeMap(
      ({ overallState, topFieldValues }) =>
        memoizedLoadViewBySwimlane(
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
      ({ overallState }, viewBySwimlaneState) => {
        if (selectedCells !== null && selectedCells.showTopFieldValues === true) {
          // Click is in one of the cells in the Overall swimlane - reload the 'view by' swimlane
          // to show the top 'view by' values for the selected time.
          return {
            type: EXPLORER_ACTION.SET_STATE,
            payload: {
              ...overallState,
              ...viewBySwimlaneState,
              viewByLoadedForTimeFormatted: formatHumanReadableDateTime(timerange.earliestMs),
              viewBySwimlaneFieldName,
              viewBySwimlaneOptions,
            },
          };
        } else {
          return {
            type: EXPLORER_ACTION.SET_STATE,
            payload: {
              ...overallState,
              ...viewBySwimlaneState,
              viewBySwimlaneFieldName,
              viewBySwimlaneOptions,
            },
          };
        }
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
    })
  );
}
