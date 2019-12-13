/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatHumanReadableDateTime } from '../../../util/date_utils';

import { getDefaultChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION, SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../../explorer_constants';
import { Action } from '../../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDefaultSwimlaneData,
  getSelectionTimeRange,
  getSwimlaneBucketInterval,
  getViewBySwimlaneOptions,
} from '../../explorer_utils';
import { appStateReducer } from '../app_state_reducer';

import { checkSelectedCells } from './check_selected_cells';
import { clearInfluencerFilterSettings } from './clear_influencer_filter_settings';
import { initialize } from './initialize';
import { jobSelectionChange } from './job_selection_change';
import { getExplorerDefaultState, ExplorerState } from './state';
import { setInfluencerFilterSettings } from './set_influencer_filter_settings';
import { setKqlQueryBarPlaceholder } from './set_kql_query_bar_placeholder';

export const explorerReducer = (state: ExplorerState, nextAction: Action): ExplorerState => {
  const { type, payload } = nextAction;

  let nextState;

  switch (type) {
    case EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS:
      nextState = clearInfluencerFilterSettings(state);
      break;

    case EXPLORER_ACTION.CLEAR_JOBS:
      nextState = {
        ...state,
        ...getClearedSelectedAnomaliesState(),
        appState: appStateReducer(state.appState, {
          type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
        }),
        loading: false,
        selectedJobs: [],
      };
      break;

    case EXPLORER_ACTION.CLEAR_SELECTION:
      nextState = {
        ...state,
        ...getClearedSelectedAnomaliesState(),
        appState: appStateReducer(state.appState, {
          type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
        }),
      };
      break;

    case EXPLORER_ACTION.INITIALIZE:
      nextState = initialize(state, payload);
      break;

    case EXPLORER_ACTION.JOB_SELECTION_CHANGE:
      nextState = jobSelectionChange(state, payload);
      break;

    case EXPLORER_ACTION.APP_STATE_SET:
    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_VIEW_BY_SWIMLANE_FIELD_NAME:
    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      nextState = { ...state, appState: appStateReducer(state.appState, nextAction) };
      break;

    case EXPLORER_ACTION.RESET:
      nextState = getExplorerDefaultState();
      break;

    case EXPLORER_ACTION.SET_BOUNDS:
      nextState = { ...state, bounds: payload };
      break;

    case EXPLORER_ACTION.SET_CHARTS:
      nextState = {
        ...state,
        chartsData: {
          ...getDefaultChartsData(),
          chartsPerRow: payload.chartsPerRow,
          seriesToPlot: payload.seriesToPlot,
          // convert truthy/falsy value to Boolean
          tooManyBuckets: !!payload.tooManyBuckets,
        },
      };
      break;

    case EXPLORER_ACTION.SET_INFLUENCER_FILTER_SETTINGS:
      nextState = setInfluencerFilterSettings(state, payload);
      break;

    case EXPLORER_ACTION.SET_SELECTED_CELLS:
      const selectedCells = payload;
      selectedCells.showTopFieldValues = false;

      const currentSwimlaneType = state.selectedCells?.type;
      const currentShowTopFieldValues = state.selectedCells?.showTopFieldValues;
      const newSwimlaneType = selectedCells?.type;

      if (
        (currentSwimlaneType === SWIMLANE_TYPE.OVERALL &&
          newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
        newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
        currentShowTopFieldValues === true
      ) {
        selectedCells.showTopFieldValues = true;
      }

      nextState = {
        ...state,
        appState: appStateReducer(state.appState, {
          type: EXPLORER_ACTION.APP_STATE_SAVE_SELECTION,
          payload,
        }),
        selectedCells,
      };
      break;

    case EXPLORER_ACTION.SET_STATE:
      nextState = { ...state, ...payload };
      break;

    case EXPLORER_ACTION.SET_SWIMLANE_CONTAINER_WIDTH:
      if (state.noInfluencersConfigured === true) {
        // swimlane is full width, minus 30 for the 'no influencers' info icon,
        // minus 170 for the lane labels, minus 50 padding
        nextState = { ...state, swimlaneContainerWidth: payload - 250 };
      } else {
        // swimlane width is 5 sixths of the window,
        // minus 170 for the lane labels, minus 50 padding
        nextState = { ...state, swimlaneContainerWidth: (payload / 6) * 5 - 220 };
      }
      break;

    case EXPLORER_ACTION.SET_SWIMLANE_LIMIT:
      nextState = {
        ...state,
        appState: appStateReducer(state.appState, {
          type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
        }),
        ...getClearedSelectedAnomaliesState(),
        swimlaneLimit: payload,
      };
      break;

    case EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_FIELD_NAME:
      const { filteredFields, influencersFilterQuery } = state;
      const viewBySwimlaneFieldName = payload;

      let maskAll = false;

      if (influencersFilterQuery !== undefined) {
        maskAll =
          viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL ||
          filteredFields.includes(viewBySwimlaneFieldName) === false;
      }

      const appStateClearedSelection = appStateReducer(state.appState, {
        type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
      });
      const appStateWithViewBySwimlane = appStateReducer(appStateClearedSelection, {
        type: EXPLORER_ACTION.APP_STATE_SAVE_VIEW_BY_SWIMLANE_FIELD_NAME,
        payload: { viewBySwimlaneFieldName },
      });

      nextState = {
        ...state,
        ...getClearedSelectedAnomaliesState(),
        appState: appStateWithViewBySwimlane,
        maskAll,
        viewBySwimlaneFieldName,
      };
      break;

    case EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_LOADING:
      const { annotationsData, overallState, tableData } = payload;
      nextState = {
        ...state,
        annotationsData,
        ...overallState,
        tableData,
        viewBySwimlaneData: {
          ...getDefaultSwimlaneData(),
        },
        viewBySwimlaneDataLoading: true,
      };
      break;

    default:
      nextState = state;
  }

  if (nextState.selectedJobs === null || nextState.bounds === undefined) {
    return nextState;
  }

  const swimlaneBucketInterval = getSwimlaneBucketInterval(
    nextState.selectedJobs,
    nextState.swimlaneContainerWidth
  );

  // Does a sanity check on the selected `viewBySwimlaneFieldName`
  // and return the available `viewBySwimlaneOptions`.
  const { viewBySwimlaneFieldName, viewBySwimlaneOptions } = getViewBySwimlaneOptions({
    currentViewBySwimlaneFieldName: nextState.viewBySwimlaneFieldName,
    filterActive: nextState.filterActive,
    filteredFields: nextState.filteredFields,
    isAndOperator: nextState.isAndOperator,
    selectedJobs: nextState.selectedJobs,
    selectedCells: nextState.selectedCells,
  });

  const { bounds, selectedCells } = nextState;

  const timerange = getSelectionTimeRange(
    selectedCells,
    swimlaneBucketInterval.asSeconds(),
    bounds
  );

  return {
    ...nextState,
    swimlaneBucketInterval,
    viewByLoadedForTimeFormatted:
      selectedCells !== null && selectedCells.showTopFieldValues === true
        ? formatHumanReadableDateTime(timerange.earliestMs)
        : null,
    viewBySwimlaneFieldName,
    viewBySwimlaneOptions,
    ...checkSelectedCells(nextState),
    ...setKqlQueryBarPlaceholder(nextState),
  };
};
