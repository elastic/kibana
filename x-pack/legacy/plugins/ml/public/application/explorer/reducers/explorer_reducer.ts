/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';

import { CombinedJob } from '../../jobs/new_job/common/job_creator/configs';

import { getDefaultChartsData } from '../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION } from '../explorer_constants';
import { Action, ActionPayload } from '../explorer_dashboard_service';
import { getDefaultViewBySwimlaneData, getInfluencers, SwimlaneData } from '../explorer_utils';

import { appStateReducer, getExplorerDefaultAppState } from './app_state_reducer';

export interface ExplorerState {
  annotationsData: any[];
  anomalyChartRecords: any[];
  appState: any;
  chartsData: any;
  fieldFormatsLoading: boolean;
  filterActive: boolean;
  filteredFields: any[];
  filterPlaceHolder: any;
  indexPattern: { title: string; fields: any[] };
  influencersFilterQuery: any;
  hasResults: boolean;
  influencers: any;
  isAndOperator: boolean;
  loading: boolean;
  noInfluencersConfigured: boolean;
  noJobsFound: boolean;
  overallSwimlaneData: SwimlaneData;
  queryString: string;
  selectedCells: any;
  selectedJobs: CombinedJob[] | null;
  swimlaneViewByFieldName: string | undefined;
  tableData: any;
  tableQueryString: string;
  viewByLoadedForTimeFormatted: any;
  viewBySwimlaneData: SwimlaneData;
  viewBySwimlaneDataLoading: boolean;
  viewBySwimlaneOptions: any[];
}

export function getExplorerDefaultState(): ExplorerState {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    appState: getExplorerDefaultAppState(),
    chartsData: getDefaultChartsData(),
    fieldFormatsLoading: false,
    filterActive: false,
    filteredFields: [],
    filterPlaceHolder: undefined,
    indexPattern: { title: ML_RESULTS_INDEX_PATTERN, fields: [] },
    influencersFilterQuery: undefined,
    hasResults: false,
    influencers: {},
    isAndOperator: false,
    loading: true,
    noInfluencersConfigured: true,
    noJobsFound: true,
    overallSwimlaneData: getDefaultViewBySwimlaneData(),
    queryString: '',
    selectedCells: null,
    selectedJobs: null,
    swimlaneViewByFieldName: undefined,
    tableData: {},
    tableQueryString: '',
    viewByLoadedForTimeFormatted: null,
    viewBySwimlaneData: getDefaultViewBySwimlaneData(),
    viewBySwimlaneDataLoading: false,
    viewBySwimlaneOptions: [],
  };
}

// Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
// Field objects required fields: name, type, aggregatable, searchable
function getIndexPattern(selectedJobs: CombinedJob[]) {
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
  const { noJobsFound, selectedCells, selectedJobs, swimlaneViewByFieldName, filterData } = payload;
  let currentSelectedCells = state.selectedCells;
  let currentSwimlaneViewByFieldName = state.swimlaneViewByFieldName;

  if (swimlaneViewByFieldName !== undefined) {
    currentSwimlaneViewByFieldName = swimlaneViewByFieldName;
  }

  if (selectedCells !== undefined && currentSelectedCells === null) {
    currentSelectedCells = selectedCells;
  }

  return {
    ...state,
    indexPattern: getIndexPattern(selectedJobs),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    noJobsFound,
    selectedCells: currentSelectedCells,
    selectedJobs,
    swimlaneViewByFieldName: currentSwimlaneViewByFieldName,
    ...(filterData.influencersFilterQuery !== undefined ? { ...filterData } : {}),
  };
};

export const explorerReducer = (state: ExplorerState, nextAction: Action) => {
  if (nextAction === null) {
    return state;
  }

  const { type, payload } = nextAction;

  switch (type) {
    case EXPLORER_ACTION.INITIALIZE:
      return initialize(state, payload);

    case EXPLORER_ACTION.APP_STATE_SET:
    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
    case EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME:
    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      return { ...state, appState: appStateReducer(state.appState, nextAction) };

    case EXPLORER_ACTION.SET_STATE:
      return { ...state, ...payload };
    default:
      return state;
  }
};
