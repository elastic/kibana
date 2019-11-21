/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic, EpicWithState } from 'redux-observable';
import { merge } from 'rxjs';
import { exhaustMap, filter, map, withLatestFrom } from 'rxjs/operators';

import { logFilterActions, logPositionActions } from '../..';
import { pickTimeKey, TimeKey, timeKeyIsBetween } from '../../../../common/time';
import {
  loadEntries,
  loadMoreEntries,
  loadNewerEntries,
  reloadEntries,
  setSourceId,
} from './actions';
import { loadEntriesEpic } from './operations/load';
import { loadMoreEntriesEpic } from './operations/load_more';

const LOAD_CHUNK_SIZE = 200;
const DESIRED_BUFFER_PAGES = 2;

interface ManageEntriesDependencies<State> {
  selectLogEntriesStart: (state: State) => TimeKey | null;
  selectLogEntriesEnd: (state: State) => TimeKey | null;
  selectHasMoreLogEntriesBeforeStart: (state: State) => boolean;
  selectHasMoreLogEntriesAfterEnd: (state: State) => boolean;
  selectIsAutoReloadingLogEntries: (state: State) => boolean;
  selectIsLoadingLogEntries: (state: State) => boolean;
  selectLogFilterQueryAsJson: (state: State) => string | null;
  selectVisibleLogMidpointOrTarget: (state: State) => TimeKey | null;
}

export const createLogEntriesEpic = <State>() =>
  combineEpics(
    createEntriesEffectsEpic<State>(),
    loadEntriesEpic as EpicWithState<typeof loadEntriesEpic, State>,
    loadMoreEntriesEpic as EpicWithState<typeof loadEntriesEpic, State>
  );

export const createEntriesEffectsEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageEntriesDependencies<State>
> => (
  action$,
  state$,
  {
    selectLogEntriesStart,
    selectLogEntriesEnd,
    selectHasMoreLogEntriesBeforeStart,
    selectHasMoreLogEntriesAfterEnd,
    selectIsAutoReloadingLogEntries,
    selectIsLoadingLogEntries,
    selectLogFilterQueryAsJson,
    selectVisibleLogMidpointOrTarget,
  }
) => {
  const filterQuery$ = state$.pipe(map(selectLogFilterQueryAsJson));
  const visibleMidpointOrTarget$ = state$.pipe(
    map(selectVisibleLogMidpointOrTarget),
    filter(isNotNull),
    map(pickTimeKey)
  );

  const sourceId$ = action$.pipe(
    filter(setSourceId.match),
    map(({ payload }) => payload)
  );

  const shouldLoadAroundNewPosition$ = action$.pipe(
    filter(logPositionActions.jumpToTargetPosition.match),
    withLatestFrom(state$),
    filter(([{ payload }, state]) => {
      const entriesStart = selectLogEntriesStart(state);
      const entriesEnd = selectLogEntriesEnd(state);

      return entriesStart && entriesEnd
        ? !timeKeyIsBetween(entriesStart, entriesEnd, payload)
        : true;
    }),
    map(([{ payload }]) => pickTimeKey(payload))
  );

  const shouldLoadWithNewFilter$ = action$.pipe(
    filter(logFilterActions.applyLogFilterQuery.match),
    withLatestFrom(filterQuery$, (filterQuery, filterQueryString) => filterQueryString)
  );

  const shouldReload$ = merge(action$.pipe(filter(reloadEntries.match)), sourceId$);

  const shouldLoadMoreBefore$ = action$.pipe(
    filter(logPositionActions.reportVisiblePositions.match),
    filter(({ payload: { pagesBeforeStart } }) => pagesBeforeStart < DESIRED_BUFFER_PAGES),
    withLatestFrom(state$),
    filter(
      ([action, state]) =>
        !selectIsAutoReloadingLogEntries(state) &&
        !selectIsLoadingLogEntries(state) &&
        selectHasMoreLogEntriesBeforeStart(state)
    ),
    map(([action, state]) => selectLogEntriesStart(state)),
    filter(isNotNull),
    map(pickTimeKey)
  );

  const shouldLoadMoreAfter$ = merge(
    action$.pipe(
      filter(logPositionActions.reportVisiblePositions.match),
      filter(({ payload: { pagesAfterEnd } }) => pagesAfterEnd < DESIRED_BUFFER_PAGES),
      withLatestFrom(state$, (action, state) => state),
      filter(
        state =>
          !selectIsAutoReloadingLogEntries(state) &&
          !selectIsLoadingLogEntries(state) &&
          selectHasMoreLogEntriesAfterEnd(state)
      )
    ),
    action$.pipe(
      filter(loadNewerEntries.match),
      withLatestFrom(state$, (action, state) => state)
    )
  ).pipe(
    map(state => selectLogEntriesEnd(state)),
    filter(isNotNull),
    map(pickTimeKey)
  );

  return merge(
    shouldLoadAroundNewPosition$.pipe(
      withLatestFrom(filterQuery$, sourceId$),
      exhaustMap(([timeKey, filterQuery, sourceId]) => [
        loadEntries({
          sourceId,
          timeKey,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: LOAD_CHUNK_SIZE,
          filterQuery,
        }),
      ])
    ),
    shouldLoadWithNewFilter$.pipe(
      withLatestFrom(visibleMidpointOrTarget$, sourceId$),
      exhaustMap(([filterQuery, timeKey, sourceId]) => [
        loadEntries({
          sourceId,
          timeKey,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: LOAD_CHUNK_SIZE,
          filterQuery,
        }),
      ])
    ),
    shouldReload$.pipe(
      withLatestFrom(visibleMidpointOrTarget$, filterQuery$, sourceId$),
      exhaustMap(([_, timeKey, filterQuery, sourceId]) => [
        loadEntries({
          sourceId,
          timeKey,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: LOAD_CHUNK_SIZE,
          filterQuery,
        }),
      ])
    ),
    shouldLoadMoreAfter$.pipe(
      withLatestFrom(filterQuery$, sourceId$),
      exhaustMap(([timeKey, filterQuery, sourceId]) => [
        loadMoreEntries({
          sourceId,
          timeKey,
          countBefore: 0,
          countAfter: LOAD_CHUNK_SIZE,
          filterQuery,
        }),
      ])
    ),
    shouldLoadMoreBefore$.pipe(
      withLatestFrom(filterQuery$, sourceId$),
      exhaustMap(([timeKey, filterQuery, sourceId]) => [
        loadMoreEntries({
          sourceId,
          timeKey,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: 0,
          filterQuery,
        }),
      ])
    )
  );
};

const isNotNull = <T>(value: T | null): value is T => value !== null;
