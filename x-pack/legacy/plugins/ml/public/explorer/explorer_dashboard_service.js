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

import { from, isObservable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, scan } from 'rxjs/operators';

import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';

import { EXPLORER_ACTION } from './explorer_constants';
import { getDefaultChartsData } from './explorer_charts/explorer_charts_container_service';
import { getDefaultViewBySwimlaneData, getInfluencers } from './explorer_utils';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();
export const explorerAction$ = new Subject();

// Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
// Field objects required fields: name, type, aggregatable, searchable
function getIndexPattern(selectedJobs) {
  const indexPattern = { title: ML_RESULTS_INDEX_PATTERN, fields: [] };
  const influencers = getInfluencers(selectedJobs);

  indexPattern.fields = influencers.map((influencer) => ({
    name: influencer,
    type: 'string',
    aggregatable: true,
    searchable: true
  }));

  return indexPattern;
}

export function getExplorerDefaultAppState() {
  return {
    mlExplorerSwimlane: {},
    mlExplorerFilter: {},
  };
}

export function getExplorerDefaultState() {
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

const initialize = (state, payload) => {
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
    noInfluencersConfigured: (getInfluencers(selectedJobs).length === 0),
    noJobsFound,
    selectedCells: currentSelectedCells,
    selectedJobs,
    swimlaneViewByFieldName: currentSwimlaneViewByFieldName
  };

  if (filterData.influencersFilterQuery !== undefined) {
    Object.assign(stateUpdate, { ...filterData });
  }

  stateUpdate.indexPattern = getIndexPattern(selectedJobs);

  return { ...state, stateUpdate };
};

const appStateClearSelection = appState => {
  delete appState.mlExplorerSwimlane.selectedType;
  delete appState.mlExplorerSwimlane.selectedLanes;
  delete appState.mlExplorerSwimlane.selectedTimes;
  delete appState.mlExplorerSwimlane.showTopFieldValues;
  return appState;
};

const appStateSaveSelection = (appState, payload) => {
  const swimlaneSelectedCells = payload.swimlaneSelectedCells;
  appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
  appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
  appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
  appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
  appState.mlExplorerSwimlane.viewByFieldName = swimlaneSelectedCells.viewByFieldName;
  return appState;
};

const appStateSaveSwimlaneViewByFieldName = (appState, payload) => {
  appState.mlExplorerSwimlane.viewByFieldName = payload.swimlaneViewByFieldName;
  return appState;
};

const appStateSaveInfluencerFilterSettings = (appState, payload) => {
  appState.mlExplorerFilter.influencersFilterQuery = payload.influencersFilterQuery;
  appState.mlExplorerFilter.filterActive = payload.filterActive;
  appState.mlExplorerFilter.filteredFields = payload.filteredFields;
  appState.mlExplorerFilter.queryString = payload.queryString;
  return appState;
};

const appStateClearInfluencerFilterSettings = appState => {
  delete appState.mlExplorerFilter.influencersFilterQuery;
  delete appState.mlExplorerFilter.filterActive;
  delete appState.mlExplorerFilter.filteredFields;
  delete appState.mlExplorerFilter.queryString;
  return appState;
};

const reducer = (state, nextAction) => {
  if (nextAction === null) {
    return state;
  }

  const { action, payload } = nextAction;

  switch (action) {
    case EXPLORER_ACTION.INITIALIZE:
      return initialize(state, payload);

    case EXPLORER_ACTION.FIELD_FORMATS_LOADING:
      return { ...state, fieldFormatsLoading: true };

    case EXPLORER_ACTION.FIELD_FORMATS_LOADED:
      return { ...state, fieldFormatsLoading: false };

    case EXPLORER_ACTION.APP_STATE_SET:
      return { ...state, appState: { ...state.appState, ...payload } };

    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
      return { ...state, appState: appStateClearSelection(cloneDeep(state.appState)) };

    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
      return { ...state, appState: appStateSaveSelection(cloneDeep(state.appState), payload) };

    case EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME:
      return { ...state, appState: appStateSaveSwimlaneViewByFieldName(cloneDeep(state.appState), payload) };

    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
      return { ...state, appState: appStateSaveInfluencerFilterSettings(cloneDeep(state.appState), payload) };

    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      return { ...state, appState: appStateClearInfluencerFilterSettings(cloneDeep(state.appState)) };

    default:
      return state;
  }
};

const triggerSideEffect = nextAction => {
  if (nextAction !== null && isObservable(nextAction.payload)) {
    explorerAction$.next({ action: nextAction.action });
    explorerAction$.next(nextAction.payload);
  }
  return nextAction;
};

const filterSideEffect = nextAction => nextAction === null || !isObservable(nextAction.payload);

export const explorerFilteredAction$ = explorerAction$.pipe(
  flatMap((action) => isObservable(action) ? action : from([action])),
  map(triggerSideEffect),
  filter(filterSideEffect),
  distinctUntilChanged(((prev, curr) => (prev !== null && curr !== null && prev.action === curr.action)))
);

// filter events which should not be propagated to the Explorer react component.
export const explorer$ = explorerFilteredAction$.pipe(
  filter(action => {
    if (action === null) {
      return true;
    }

    switch(action.action) {
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
  distinctUntilChanged(((prev, curr) => (prev !== null && curr !== null && prev.action === curr.action))),
);

export const explorerState$ = explorerFilteredAction$.pipe(
  scan(reducer, getExplorerDefaultState())
);

export const explorerAppState$ = explorerState$.pipe(
  map(state => state.appState),
  distinctUntilChanged(isEqual),
);
