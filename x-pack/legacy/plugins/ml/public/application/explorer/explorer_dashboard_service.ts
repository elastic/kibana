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

import { from, isObservable, BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, flatMap, map, pairwise, scan } from 'rxjs/operators';

import { DeepPartial } from '../../../common/types/common';

import { jobSelectionActionCreator, loadExplorerData } from './actions';
import { ExplorerChartsData } from './explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION } from './explorer_constants';
import { RestoredAppState, SelectedCells, TimeRangeBounds } from './explorer_utils';
import {
  explorerReducer,
  getExplorerDefaultState,
  ExplorerAppState,
  ExplorerState,
} from './reducers';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();

type ExplorerAction = Action | Observable<ActionPayload>;
const explorerAction$ = new BehaviorSubject<ExplorerAction>({ type: EXPLORER_ACTION.RESET });

export type ActionPayload = any;

export interface Action {
  type: string;
  payload?: ActionPayload;
}

const explorerFilteredAction$ = explorerAction$.pipe(
  // consider observables as side-effects
  flatMap((action: ExplorerAction) =>
    isObservable(action) ? action : (from([action]) as Observable<ExplorerAction>)
  ),
  distinctUntilChanged(isEqual)
);

// applies action and returns state
const explorerState$: Observable<ExplorerState> = explorerFilteredAction$.pipe(
  scan(explorerReducer, getExplorerDefaultState()),
  pairwise(),
  map(([prev, curr]) => {
    if (
      curr.selectedJobs !== null &&
      curr.bounds !== undefined &&
      !isEqual(getCompareState(prev), getCompareState(curr))
    ) {
      explorerAction$.next(loadExplorerData(curr).pipe(map(d => setStateActionCreator(d))));
    }
    return curr;
  })
);

const explorerAppState$: Observable<ExplorerAppState> = explorerState$.pipe(
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

export const setStateActionCreator = (payload: DeepPartial<ExplorerState>) => ({
  type: EXPLORER_ACTION.SET_STATE,
  payload,
});

interface AppStateSelection {
  type: string;
  lanes: string[];
  times: number[];
  showTopFieldValues: boolean;
  viewByFieldName: string;
}

// Export observable state and action dispatchers as service
export const explorerService = {
  appState$: explorerAppState$,
  state$: explorerState$,
  appStateClearSelection: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
  },
  appStateSaveSelection: (payload: AppStateSelection) => {
    explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_SAVE_SELECTION, payload });
  },
  clearInfluencerFilterSettings: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS });
  },
  clearJobs: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_JOBS });
  },
  clearSelection: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_SELECTION });
  },
  updateJobSelection: (selectedJobIds: string[], restoredAppState: RestoredAppState) => {
    explorerAction$.next(
      jobSelectionActionCreator(
        EXPLORER_ACTION.JOB_SELECTION_CHANGE,
        selectedJobIds,
        restoredAppState
      )
    );
  },
  initialize: (selectedJobIds: string[], restoredAppState: RestoredAppState) => {
    explorerAction$.next(
      jobSelectionActionCreator(EXPLORER_ACTION.INITIALIZE, selectedJobIds, restoredAppState)
    );
  },
  reset: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.RESET });
  },
  setAppState: (payload: DeepPartial<ExplorerAppState>) => {
    explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_SET, payload });
  },
  setBounds: (payload: TimeRangeBounds) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_BOUNDS, payload });
  },
  setCharts: (payload: ExplorerChartsData) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS, payload });
  },
  setInfluencerFilterSettings: (payload: any) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_INFLUENCER_FILTER_SETTINGS,
      payload,
    });
  },
  setSelectedCells: (payload: SelectedCells) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_SELECTED_CELLS,
      payload,
    });
  },
  setState: (payload: DeepPartial<ExplorerState>) => {
    explorerAction$.next(setStateActionCreator(payload));
  },
  setSwimlaneContainerWidth: (payload: number) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_SWIMLANE_CONTAINER_WIDTH,
      payload,
    });
  },
  setSwimlaneLimit: (payload: number) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_SWIMLANE_LIMIT, payload });
  },
  setViewBySwimlaneFieldName: (payload: string) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_FIELD_NAME, payload });
  },
  setViewBySwimlaneLoading: (payload: any) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_LOADING, payload });
  },
};
