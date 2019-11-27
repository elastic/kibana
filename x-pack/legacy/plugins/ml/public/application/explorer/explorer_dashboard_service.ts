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

import { loadExplorerDataActionCreator } from './actions';
import { explorerReducer, getExplorerDefaultState, ExplorerState } from './reducers';

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
      explorerAction$.next(loadExplorerDataActionCreator(curr));
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
