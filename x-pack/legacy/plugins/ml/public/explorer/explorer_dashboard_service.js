/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { isObservable, BehaviorSubject, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';

import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';

import { EXPLORER_ACTION } from './explorer_constants';
import { getDefaultChartsData } from './explorer_charts/explorer_charts_container_service';
import { getDefaultViewBySwimlaneData, getInfluencers } from './explorer_utils';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();
export const explorer$ = new BehaviorSubject(null);

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


export function getExplorerDefaultState() {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    chartsData: getDefaultChartsData(),
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

const sideEffect = (nextAction) => {
  if (nextAction !== null && isObservable(nextAction.payload)) {
    explorer$.next(nextAction.payload);
  }

  return nextAction;
};

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

const reducer = (state, nextAction) => {
  if (nextAction === null) {
    return state;
  }

  const { action, payload } = nextAction;

  switch (action) {
    case EXPLORER_ACTION.INITIALIZE:
      return initialize(state, payload);

    default:
      return state;
  }

};

export const explorerState$ = explorer$.pipe(
  map(sideEffect),
  scan(reducer, getExplorerDefaultState())
);
