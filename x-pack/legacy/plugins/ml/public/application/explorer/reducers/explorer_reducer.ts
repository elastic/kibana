/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../common/constants/index_patterns';
import { Dictionary } from '../../../../common/types/common';

import { getDefaultChartsData } from '../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION, VIEW_BY_JOB_LABEL } from '../explorer_constants';
import { Action, ActionPayload } from '../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDefaultSwimlaneData,
  getInfluencers,
  ExplorerJob,
  SwimlaneData,
} from '../explorer_utils';

import { appStateReducer, getExplorerDefaultAppState, ExplorerAppState } from './app_state_reducer';

export interface ExplorerState {
  annotationsData: any[];
  anomalyChartRecords: any[];
  appState: ExplorerAppState;
  bounds: any;
  chartsData: any;
  fieldFormatsLoading: boolean;
  filterActive: boolean;
  filteredFields: any[];
  filterPlaceHolder: any;
  indexPattern: { title: string; fields: any[] };
  influencersFilterQuery: any;
  influencers: Dictionary<unknown>;
  isAndOperator: boolean;
  loading: boolean;
  noInfluencersConfigured: boolean;
  overallSwimlaneData: SwimlaneData;
  queryString: string;
  selectedCells: any;
  selectedJobs: ExplorerJob[] | null;
  swimlaneBucketInterval: any;
  swimlaneContainerWidth: number;
  swimlaneLimit: number;
  tableData: any;
  tableInterval: string;
  tableQueryString: string;
  tableSeverity: number;
  viewByLoadedForTimeFormatted: string | null;
  viewBySwimlaneData: SwimlaneData;
  viewBySwimlaneDataLoading: boolean;
  viewBySwimlaneFieldName?: string;
  viewBySwimlaneOptions: string[];
}

function getDefaultIndexPattern() {
  return { title: ML_RESULTS_INDEX_PATTERN, fields: [] };
}
export function getExplorerDefaultState(): ExplorerState {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    appState: getExplorerDefaultAppState(),
    bounds: undefined,
    chartsData: getDefaultChartsData(),
    fieldFormatsLoading: false,
    filterActive: false,
    filteredFields: [],
    filterPlaceHolder: undefined,
    indexPattern: getDefaultIndexPattern(),
    influencersFilterQuery: undefined,
    influencers: {},
    isAndOperator: false,
    loading: true,
    noInfluencersConfigured: true,
    overallSwimlaneData: getDefaultSwimlaneData(),
    queryString: '',
    selectedCells: null,
    selectedJobs: null,
    swimlaneBucketInterval: undefined,
    swimlaneContainerWidth: 0,
    swimlaneLimit: 10,
    tableData: {},
    tableInterval: 'auto',
    tableQueryString: '',
    tableSeverity: 0,
    viewByLoadedForTimeFormatted: null,
    viewBySwimlaneData: getDefaultSwimlaneData(),
    viewBySwimlaneDataLoading: false,
    viewBySwimlaneFieldName: undefined,
    viewBySwimlaneOptions: [],
  };
}

function clearInfluencerFilterSetting(state: ExplorerState) {
  const appStateClearInfluencer = appStateReducer(state.appState, {
    type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS,
  });
  const appStateClearSelection = appStateReducer(appStateClearInfluencer, {
    type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
  });

  return {
    ...state,
    appState: appStateClearSelection,
    filterActive: false,
    filteredFields: [],
    influencersFilterQuery: undefined,
    isAndOperator: false,
    maskAll: false,
    queryString: '',
    tableQueryString: '',
    ...getClearedSelectedAnomaliesState(),
  };
}

// Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
// Field objects required fields: name, type, aggregatable, searchable
export function getIndexPattern(selectedJobs: ExplorerJob[]) {
  return {
    title: ML_RESULTS_INDEX_PATTERN,
    fields: getInfluencers(selectedJobs).map(influencer => ({
      name: influencer,
      type: 'string',
      aggregatable: true,
      searchable: true,
    })),
  };
}

const initialize = (state: ExplorerState, payload: ActionPayload) => {
  const { selectedCells, selectedJobs, viewBySwimlaneFieldName, filterData } = payload;
  let currentSelectedCells = state.selectedCells;
  let currentviewBySwimlaneFieldName = state.viewBySwimlaneFieldName;

  if (viewBySwimlaneFieldName !== undefined) {
    currentviewBySwimlaneFieldName = viewBySwimlaneFieldName;
  }

  if (selectedCells !== undefined && currentSelectedCells === null) {
    currentSelectedCells = selectedCells;
  }

  return {
    ...state,
    indexPattern: getIndexPattern(selectedJobs),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    selectedCells: currentSelectedCells,
    selectedJobs,
    viewBySwimlaneFieldName: currentviewBySwimlaneFieldName,
    ...(filterData.influencersFilterQuery !== undefined ? { ...filterData } : {}),
  };
};

const jobSelectionChange = (state: ExplorerState, payload: ActionPayload) => {
  const { selectedJobs } = payload;
  const stateUpdate: ExplorerState = {
    ...state,
    appState: appStateReducer(getExplorerDefaultState().appState, {
      type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
    }),
    ...getClearedSelectedAnomaliesState(),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    overallSwimlaneData: getDefaultSwimlaneData(),
    selectedJobs,
  };

  // clear filter if selected jobs have no influencers
  if (stateUpdate.noInfluencersConfigured === true) {
    stateUpdate.appState = appStateReducer(stateUpdate.appState, {
      type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS,
    });
    const noFilterState = {
      filterActive: false,
      filteredFields: [],
      influencersFilterQuery: undefined,
      maskAll: false,
      queryString: '',
      tableQueryString: '',
    };

    Object.assign(stateUpdate, noFilterState);
  } else {
    // indexPattern will not be used if there are no influencers so set up can be skipped
    // indexPattern is passed to KqlFilterBar which is only shown if (noInfluencersConfigured === false)
    stateUpdate.indexPattern = getIndexPattern(selectedJobs);
  }

  if (selectedJobs.length > 1) {
    stateUpdate.viewBySwimlaneFieldName = VIEW_BY_JOB_LABEL;
    return stateUpdate;
  }

  stateUpdate.loading = true;
  return stateUpdate;
};

function setInfluencerFilterSettings(state: ExplorerState, payload: ActionPayload) {
  const {
    filterQuery: influencersFilterQuery,
    isAndOperator,
    filteredFields,
    queryString,
    tableQueryString,
  } = payload;

  const { selectedCells, viewBySwimlaneOptions } = state;
  let selectedViewByFieldName = state.viewBySwimlaneFieldName;

  // if it's an AND filter set view by swimlane to job ID as the others will have no results
  if (isAndOperator && selectedCells === null) {
    selectedViewByFieldName = VIEW_BY_JOB_LABEL;
  } else {
    // Set View by dropdown to first relevant fieldName based on incoming filter if there's no cell selection already
    // or if selected cell is from overall swimlane as this won't include an additional influencer filter
    for (let i = 0; i < filteredFields.length; i++) {
      if (
        viewBySwimlaneOptions.includes(filteredFields[i]) &&
        (selectedCells === null || (selectedCells && selectedCells.type === 'overall'))
      ) {
        selectedViewByFieldName = filteredFields[i];
        break;
      }
    }
  }

  const appState = appStateReducer(state.appState, {
    type: EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS,
    payload: {
      influencersFilterQuery,
      filterActive: true,
      filteredFields,
      queryString,
      tableQueryString,
      isAndOperator,
    },
  });

  return {
    ...state,
    appState,
    filterActive: true,
    filteredFields,
    influencersFilterQuery,
    isAndOperator,
    queryString,
    tableQueryString,
    maskAll:
      selectedViewByFieldName === VIEW_BY_JOB_LABEL ||
      filteredFields.includes(selectedViewByFieldName) === false,
    viewBySwimlaneFieldName: selectedViewByFieldName,
  };
}

export const explorerReducer = (state: ExplorerState, nextAction: Action) => {
  if (nextAction === null) {
    return state;
  }
  const { type, payload } = nextAction;

  switch (type) {
    case EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS:
      return clearInfluencerFilterSetting(state);

    case EXPLORER_ACTION.INITIALIZE:
      return initialize(state, payload);

    case EXPLORER_ACTION.JOB_SELECTION_CHANGE:
      return jobSelectionChange(state, payload);

    case EXPLORER_ACTION.APP_STATE_SET:
    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_VIEW_BY_SWIMLANE_FIELD_NAME:
    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      return { ...state, appState: appStateReducer(state.appState, nextAction) };

    case EXPLORER_ACTION.SET_STATE:
      if (payload.viewBySwimlaneFieldName) {
        return {
          ...state,
          ...payload,
          appState: appStateReducer(state.appState, {
            type: EXPLORER_ACTION.APP_STATE_SAVE_VIEW_BY_SWIMLANE_FIELD_NAME,
            payload: { viewBySwimlaneFieldName: payload.viewBySwimlaneFieldName },
          }),
        };
      }

      return { ...state, ...payload };

    case EXPLORER_ACTION.SET_INFLUENCER_FILTER_SETTINGS:
      return setInfluencerFilterSettings(state, payload);

    case EXPLORER_ACTION.SET_SWIMLANE_CONTAINER_WIDTH:
      if (state.noInfluencersConfigured === true) {
        // swimlane is full width, minus 30 for the 'no influencers' info icon,
        // minus 170 for the lane labels, minus 50 padding
        return { ...state, swimlaneContainerWidth: payload.swimlaneContainerWidth - 250 };
      } else {
        // swimlane width is 5 sixths of the window,
        // minus 170 for the lane labels, minus 50 padding
        return { ...state, swimlaneContainerWidth: (payload.swimlaneContainerWidth / 6) * 5 - 220 };
      }

    case EXPLORER_ACTION.SET_SWIMLANE_LIMIT:
      return {
        ...state,
        ...payload,
        appState: appStateReducer(state.appState, {
          type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
        }),
        ...getClearedSelectedAnomaliesState(),
      };

    default:
      return state;
  }
};
