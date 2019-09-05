/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic, combineEpics } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, mapTo, withLatestFrom } from 'rxjs/operators';

import {
  jumpToTargetPosition,
  jumpToTargetPositionTime,
  startAutoReload,
  stopAutoReload,
  reportVisiblePositions,
} from './actions';

const createLiveStreamEpic = <State>(): Epic<Action, Action, State, {}> => action$ =>
  action$.pipe(
    filter(startAutoReload.match),
    exhaustMap(({ payload }) =>
      timer(0, payload).pipe(
        map(() => jumpToTargetPositionTime(Date.now(), true)),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );

const createLiveStreamScrollCancelEpic = <State>(): Epic<
  Action,
  Action,
  State,
  { selectIsAutoReloadingLogEntries: (state: State) => boolean }
> => (action$, state$, { selectIsAutoReloadingLogEntries }) =>
  action$.pipe(
    filter(
      action =>
        (reportVisiblePositions.match(action) && action.payload.fromScroll) ||
        (jumpToTargetPosition.match(action) && !action.payload.fromAutoReload)
    ),
    withLatestFrom(state$),
    filter(([, state]) => selectIsAutoReloadingLogEntries(state)),
    mapTo(stopAutoReload())
  );

export const createLogPositionEpic = <State>() =>
  combineEpics(createLiveStreamEpic<State>(), createLiveStreamScrollCancelEpic<State>());
