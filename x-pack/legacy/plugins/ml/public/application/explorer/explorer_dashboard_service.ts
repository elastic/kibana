/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { isEqual, pick } from 'lodash';

import { from, isObservable, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, pairwise, scan, tap } from 'rxjs/operators';

import { loadOverallDataActionCreator } from './actions';
import { explorerReducer, getExplorerDefaultState, ExplorerState } from './reducers';
import { getSwimlaneBucketInterval } from './explorer_utils';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();

type ExplorerAction = Action | Observable<ActionPayload> | null;
export const explorerAction$ = new Subject<ExplorerAction>();

export type ActionPayload = any;

export interface Action {
  type: string;
  payload?: ActionPayload;
}

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
  distinctUntilChanged(isEqual)
);

// applies action and returns state
export const explorerState$ = explorerFilteredAction$.pipe(
  scan(explorerReducer, getExplorerDefaultState()),
  pairwise(),
  map(([prev, curr]) => {
    if (
      curr.selectedJobs !== null &&
      curr.bounds !== undefined &&
      !isEqual(getCompareState(prev), getCompareState(curr))
    ) {
      explorerFetchSideEffect(curr);
    }
    return curr;
  })
);

export const explorerAppState$ = explorerState$.pipe(
  map((state: ExplorerState) => state.appState),
  distinctUntilChanged(isEqual)
);

function getCompareState(state: ExplorerState) {
  return pick(state, [
    'bounds',
    'filterActive',
    'filteredFields',
    'influencersFilterQuery',
    'isAndOperator',
    'noInfluencersConfigured',
    'selectedCells',
    'selectedJobs',
    'swimlaneContainerWidth',
    'swimlaneLimit',
    'tableInterval',
    'tableSeverity',
    'viewBySwimlaneFieldName',
  ]);
}

function explorerFetchSideEffect(state: ExplorerState) {
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
    viewBySwimlaneFieldName,
  } = state;

  // Load the overall data - if the FieldFormats failed to populate
  explorerAction$.next(
    loadOverallDataActionCreator(
      selectedCells,
      selectedJobs,
      getSwimlaneBucketInterval(selectedJobs, swimlaneContainerWidth),
      bounds,
      viewBySwimlaneFieldName,
      influencersFilterQuery,
      swimlaneLimit,
      noInfluencersConfigured,
      filterActive,
      filteredFields,
      tableInterval,
      tableSeverity,
      isAndOperator
    )
  );
}
