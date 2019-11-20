/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { isEqual, cloneDeep } from 'lodash';

import { from, isObservable, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, scan, tap } from 'rxjs/operators';

import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';

import { CombinedJob } from '../jobs/new_job/common/job_creator/configs';

import { EXPLORER_ACTION } from './explorer_constants';
import { getDefaultChartsData } from './explorer_charts/explorer_charts_container_service';
import { getDefaultViewBySwimlaneData, getInfluencers } from './explorer_utils';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();

type ExplorerAction = Action | Observable<ActionPayload> | null;
export const explorerAction$ = new Subject<ExplorerAction>();

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

export interface ExplorerAppState {
  mlExplorerSwimlane: any;
  mlExplorerFilter: any;
}

export function getExplorerDefaultAppState(): ExplorerAppState {
  return {
    mlExplorerSwimlane: {},
    mlExplorerFilter: {},
  };
}

interface ExplorerState {
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
  overallSwimlaneData: any[];
  queryString: string;
  selectedCells: any;
  selectedJobs: CombinedJob[] | null;
  swimlaneViewByFieldName: string | undefined;
  tableData: any;
  tableQueryString: string;
  viewByLoadedForTimeFormatted: any;
  viewBySwimlaneData: any;
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
    overallSwimlaneData: [],
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

type ActionPayload = any;

interface Action {
  type: string;
  payload?: ActionPayload;
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

  const stateUpdate = {
    indexPattern: getIndexPattern(selectedJobs),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    noJobsFound,
    selectedCells: currentSelectedCells,
    selectedJobs,
    swimlaneViewByFieldName: currentSwimlaneViewByFieldName,
    ...(filterData.influencersFilterQuery !== undefined ? { ...filterData } : {}),
  };

  return { ...state, stateUpdate };
};

const appStateReducer = (state: ExplorerAppState, nextAction: Action) => {
  const { type, payload } = nextAction;

  const appState = cloneDeep(state);

  switch (type) {
    case EXPLORER_ACTION.APP_STATE_SET:
      return { ...appState, ...payload };

    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
      delete appState.mlExplorerSwimlane.selectedType;
      delete appState.mlExplorerSwimlane.selectedLanes;
      delete appState.mlExplorerSwimlane.selectedTimes;
      delete appState.mlExplorerSwimlane.showTopFieldValues;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
      const swimlaneSelectedCells = payload.swimlaneSelectedCells;
      appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
      appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
      appState.mlExplorerSwimlane.viewByFieldName = swimlaneSelectedCells.viewByFieldName;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME:
      appState.mlExplorerSwimlane.viewByFieldName = payload.swimlaneViewByFieldName;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
      appState.mlExplorerFilter.influencersFilterQuery = payload.influencersFilterQuery;
      appState.mlExplorerFilter.filterActive = payload.filterActive;
      appState.mlExplorerFilter.filteredFields = payload.filteredFields;
      appState.mlExplorerFilter.queryString = payload.queryString;
      return appState;

    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      delete appState.mlExplorerFilter.influencersFilterQuery;
      delete appState.mlExplorerFilter.filterActive;
      delete appState.mlExplorerFilter.filteredFields;
      delete appState.mlExplorerFilter.queryString;
      return appState;

    default:
      return state;
  }
};

const explorerReducer = (state: ExplorerState, nextAction: Action) => {
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

const triggerSideEffect = (nextAction: Action) => {
  if (nextAction !== null && isObservable(nextAction.payload)) {
    explorerAction$.next({ type: nextAction.type });
    explorerAction$.next(nextAction.payload);
  }
};

const filterSideEffect = (nextAction: Action) =>
  nextAction === null || !isObservable(nextAction.payload);

export const explorerFilteredAction$ = explorerAction$.pipe(
  flatMap((action: ExplorerAction) =>
    isObservable(action) ? action : (from([action]) as Observable<ExplorerAction>)
  ),
  tap(triggerSideEffect),
  filter(filterSideEffect),
  distinctUntilChanged((prev, curr) => prev !== null && curr !== null && prev.type === curr.type)
);

// filter events which should not be propagated to the Explorer react component.
export const explorer$ = explorerFilteredAction$.pipe(
  filter((action: Action) => {
    if (action === null) {
      return true;
    }

    switch (action.type) {
      case EXPLORER_ACTION.IDLE:
      case EXPLORER_ACTION.INITIALIZE:
      case EXPLORER_ACTION.JOB_SELECTION_CHANGE:
      case EXPLORER_ACTION.REDRAW:
      case EXPLORER_ACTION.RELOAD:
        return true;
      default:
        return false;
    }
  }),
  distinctUntilChanged(isEqual)
);

// applies action and returns state
export const explorerState$ = explorerFilteredAction$.pipe(
  scan(explorerReducer, getExplorerDefaultState())
);

export const explorerAppState$ = explorerState$.pipe(
  map((state: ExplorerState) => state.appState),
  distinctUntilChanged(isEqual)
);
