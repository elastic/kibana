/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { isEqual } from 'lodash';

import { from, isObservable, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, scan, tap } from 'rxjs/operators';

import { EXPLORER_ACTION } from './explorer_constants';
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
